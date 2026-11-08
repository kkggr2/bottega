import { supabase } from "./supabase";
import type { PieceType } from "./types";

/* The guestbook, "this one got me" reactions, and recommendations left at a friend's door. */

export type Note = { id: string; room_owner: string; author: string; body: string; created_at: string; username?: string };
export type Recommendation = {
  id: string; to_user: string; from_user: string; type: "song" | "poster" | "scene" | "book";
  title: string; subtitle: string; cover_url: string | null; preview_url: string | null; link: string | null;
  note: string; status: "new" | "kept" | "passed"; created_at: string; username?: string;
};

const needsUpdate = (msg: string) => /notes|reactions|recommendations|schema cache/i.test(msg);
const friendly = (msg: string, fallback: string) =>
  needsUpdate(msg) ? "The database needs its latest update. Run the newest file in supabase/migrations." : fallback;

async function withUsernames<T extends { username?: string }>(rows: T[], idOf: (r: T) => string): Promise<T[]> {
  const ids = [...new Set(rows.map(idOf))];
  if (!ids.length) return rows;
  const { data } = await supabase().from("profiles").select("id, username").in("id", ids);
  const names = new Map((data ?? []).map((p) => [p.id as string, p.username as string]));
  return rows.map((r) => ({ ...r, username: names.get(idOf(r)) ?? "someone" }));
}

export async function loadNotes(ownerId: string): Promise<Note[]> {
  const { data, error } = await supabase().from("notes").select("*").eq("room_owner", ownerId)
    .order("created_at", { ascending: false }).limit(50);
  if (error) return [];
  return withUsernames((data ?? []) as Note[], (n) => n.author);
}

export async function addNote(ownerId: string, authorId: string, body: string): Promise<string | null> {
  const { data, error } = await supabase().from("notes")
    .insert({ room_owner: ownerId, author: authorId, body: body.trim().slice(0, 500) }).select("id").single();
  if (error) return friendly(error.message, /lot of notes/.test(error.message) ? error.message : "Couldn't leave the note. Try again.");
  if (ownerId !== authorId && data) void notifyWall("note", data.id as string);
  return null;
}

export async function deleteNote(id: string): Promise<void> {
  await supabase().from("notes").delete().eq("id", id);
}

/** Who reacted to a piece (the owner sees names; a visitor only sees their own reaction). */
export async function loadReactions(pieceId: string): Promise<{ user_id: string; username?: string }[]> {
  const { data, error } = await supabase().from("reactions").select("user_id").eq("piece_id", pieceId);
  if (error) return [];
  return withUsernames((data ?? []) as { user_id: string; username?: string }[], (r) => r.user_id);
}

export async function setReaction(pieceId: string, userId: string, on: boolean): Promise<string | null> {
  const sb = supabase();
  const { error } = on
    ? await sb.from("reactions").insert({ piece_id: pieceId, user_id: userId })
    : await sb.from("reactions").delete().eq("piece_id", pieceId).eq("user_id", userId);
  if (error && !/duplicate/i.test(error.message)) return friendly(error.message, "Couldn't save that. Try again.");
  return null;
}

export async function recommend(rec: Omit<Recommendation, "id" | "status" | "created_at" | "username">): Promise<string | null> {
  const { data, error } = await supabase().from("recommendations").insert(rec).select("id").single();
  if (error) return friendly(error.message, "Couldn't send it. Try again.");
  if (data) void notifyWall("rec", data.id as string);
  return null;
}

export async function loadRecommendations(toUser: string): Promise<Recommendation[]> {
  const { data, error } = await supabase().from("recommendations").select("*").eq("to_user", toUser).eq("status", "new")
    .order("created_at", { ascending: false }).limit(20);
  if (error) return [];
  return withUsernames((data ?? []) as Recommendation[], (r) => r.from_user);
}

/** Hang a recommendation in your room (it becomes one of your pieces), or pass on it. */
export async function answerRecommendation(rec: Recommendation, keep: boolean, ownerId: string): Promise<string | null> {
  const sb = supabase();
  if (keep) {
    const type: PieceType = rec.type;
    const { error } = await sb.from("pieces").insert({
      owner_id: ownerId, type, title: rec.title, subtitle: rec.subtitle,
      body: rec.note ? `Recommended by @${rec.username}: “${rec.note}”` : `Recommended by @${rec.username}`,
      cover_url: rec.cover_url, preview_url: rec.type === "song" ? rec.preview_url : null, link: rec.link,
    });
    if (error) return "Couldn't hang it. Try again.";
  }
  await sb.from("recommendations").update({ status: keep ? "kept" : "passed" }).eq("id", rec.id);
  return null;
}

/** Tell the other person's phone. Fire and forget; the server checks it's real and limits how often. */
export async function notifyWall(kind: "note" | "rec", id: string): Promise<void> {
  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/push/wall", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id }),
    });
  } catch {}
}
