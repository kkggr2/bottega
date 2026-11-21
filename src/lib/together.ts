import { supabase } from "./supabase";
import type { Piece, Room, ThemeKey, Wallpaper } from "./types";

/* Rooms for two: supabase/migrations/20261126000000_together.sql. */

export type TogetherSummary = {
  room_id: string; name: string; theme: ThemeKey; status: "invited" | "joined";
  partner: string | null; partner_status: "invited" | "joined" | null; invited_by_me: boolean; covers: string[];
};

export type TogetherRoom = {
  id: string; name: string; theme: ThemeKey; wallpaper: Wallpaper;
  members: { user_id: string; username: string; status: "invited" | "joined" }[];
  pieces: (Piece & { added_by_name: string })[];
};

const needsUpdate = (msg: string) => /together|schema cache|does not exist/i.test(msg);
function friendly(msg: string, fallback: string): string {
  if (needsUpdate(msg)) return "The database needs its latest update. Run the newest file in supabase/migrations.";
  const known = msg.match(/(You can only share a room with a friend\.|You already share a room with them\.|Each person can share up to 3 rooms\.|Keep it kind[^"]*|Add your email first[^"]*|That invitation isn't there any more\.)/);
  return known?.[1] ?? fallback;
}

export async function myTogether(): Promise<TogetherSummary[]> {
  const { data, error } = await supabase().rpc("my_together");
  if (error) return [];
  return (data ?? []) as TogetherSummary[];
}

export async function startTogether(friendId: string, name: string): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase().rpc("start_together", { p_friend: friendId, p_name: name.trim() });
  if (error) return { error: friendly(error.message, "Couldn't start the room. Try again.") };
  return { id: data as string };
}

export async function answerTogether(roomId: string, yes: boolean): Promise<string | null> {
  const { error } = await supabase().rpc("answer_together", { p_room: roomId, p_yes: yes });
  return error ? friendly(error.message, "Couldn't answer. Try again.") : null;
}

export async function leaveTogether(roomId: string): Promise<string | null> {
  const { error } = await supabase().rpc("leave_together", { p_room: roomId });
  return error ? friendly(error.message, "Couldn't leave. Try again.") : null;
}

/** The room, who's in it, and what's hung there (as regular pieces, so the room's drawing code can show them). */
export async function loadTogether(id: string): Promise<TogetherRoom | null> {
  const sb = supabase();
  const [{ data: room }, { data: members }, { data: pieces }] = await Promise.all([
    sb.from("together_rooms").select("id, name, theme, wallpaper").eq("id", id).maybeSingle(),
    sb.from("together_members").select("user_id, status").eq("room_id", id),
    sb.from("together_pieces").select("*").eq("room_id", id).order("position").order("created_at"),
  ]);
  if (!room) return null;
  const ids = [...new Set([...(members ?? []).map((m) => m.user_id as string), ...(pieces ?? []).map((p) => p.added_by as string)])];
  const { data: names } = ids.length ? await sb.from("profiles").select("id, username").in("id", ids) : { data: [] };
  const nameOf = new Map((names ?? []).map((p) => [p.id as string, p.username as string]));
  return {
    id: room.id as string, name: room.name as string, theme: room.theme as ThemeKey, wallpaper: room.wallpaper as Wallpaper,
    members: (members ?? []).map((m) => ({ user_id: m.user_id as string, username: nameOf.get(m.user_id as string) ?? "someone", status: m.status as "invited" | "joined" })),
    pieces: (pieces ?? []).map((p) => ({
      id: p.id as string, owner_id: `together:${id}`, type: p.type as Piece["type"], title: p.title as string, subtitle: p.subtitle as string,
      body: p.body as string, image_path: null, audio_path: null, link: null, cover_url: (p.cover_url as string | null) ?? null,
      preview_url: (p.preview_url as string | null) ?? null, clip_start: null, clip_end: null, position: p.position as number,
      created_at: p.created_at as string, added_by_name: nameOf.get(p.added_by as string) ?? "someone",
    })),
  };
}

export function asRoom(t: TogetherRoom): Room {
  return { owner_id: `together:${t.id}`, name: t.name, tagline: "", theme: t.theme, wallpaper: t.wallpaper, visibility: "friends" };
}

export async function hangTogether(roomId: string, me: string, p: { type: "poster" | "book" | "song"; title: string; subtitle: string; cover_url: string | null; preview_url: string | null; body: string }, position: number): Promise<string | null> {
  const { error } = await supabase().from("together_pieces").insert({ room_id: roomId, added_by: me, ...p, title: p.title.slice(0, 120), subtitle: p.subtitle.slice(0, 120), body: p.body.trim().slice(0, 500), position });
  if (!error) return null;
  return /row-level/i.test(error.message) ? "The room is full (60 pieces), or you're not in it any more." : friendly(error.message, "Couldn't hang it. Try again.");
}

export async function setTogetherWords(pieceId: string, body: string): Promise<string | null> {
  const { error } = await supabase().from("together_pieces").update({ body: body.trim().slice(0, 500) }).eq("id", pieceId);
  return error ? friendly(error.message, "Couldn't save that. Try again.") : null;
}

/** Save a new order: every piece whose place changed gets its new number. */
export async function orderTogether(next: { id: string; position: number }[]): Promise<void> {
  const sb = supabase();
  await Promise.all(next.map((p, i) => p.position === i ? null : sb.from("together_pieces").update({ position: i }).eq("id", p.id)));
}

export async function takeDownTogether(pieceId: string): Promise<void> {
  await supabase().from("together_pieces").delete().eq("id", pieceId);
}

export async function updateTogetherLook(roomId: string, look: { name: string; theme: ThemeKey; wallpaper: Wallpaper }): Promise<string | null> {
  const { error } = await supabase().from("together_rooms").update({ ...look, name: look.name.trim() }).eq("id", roomId);
  return error ? friendly(error.message, "Couldn't save. Try again.") : null;
}
