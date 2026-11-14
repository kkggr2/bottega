import { supabase } from "./supabase";

/*
 * Live chat rooms by taste, and private messages. The database decides who may read and write
 * (see supabase/migrations/20261115000000_chat.sql); these are thin helpers around it.
 */

export type ChatRoom = {
  room_key: string; slot: "song" | "film" | "book"; creator: string; my_title: string;
  people: number; messages: number; last_at: string | null;
};
export type ChatMember = { user_id: string; username: string; title: string; subtitle: string; cover_url: string | null };
export type ChatMessage = { id: string; room_key: string; author: string; body: string; created_at: string };
export type Thread = {
  other_id: string; username: string; last_body: string; last_at: string; last_from_me: boolean;
  unread: number; is_request: boolean; is_friend: boolean;
};
export type DirectMessage = { id: string; sender: string; recipient: string; body: string; created_at: string; read_at: string | null };

export const SLOT_PLACE: Record<ChatRoom["slot"], string> = { song: "on the turntable", film: "in the TV", book: "on the armchair" };

export async function myChatRooms(): Promise<ChatRoom[]> {
  const { data } = await supabase().rpc("my_chat_rooms");
  return (data ?? []) as ChatRoom[];
}

export async function chatMembers(key: string): Promise<ChatMember[]> {
  const { data } = await supabase().rpc("chat_members", { p_key: key });
  return (data ?? []) as ChatMember[];
}

export async function chatMessages(key: string): Promise<ChatMessage[]> {
  const { data } = await supabase().from("chat_messages").select("*").eq("room_key", key)
    .order("created_at", { ascending: true }).limit(300);
  return (data ?? []) as ChatMessage[];
}

/** Returns an error to show, or null. */
export async function sendChat(key: string, me: string, body: string): Promise<string | null> {
  const { error } = await supabase().from("chat_messages").insert({ room_key: key, author: me, body: body.trim() });
  return error ? friendly(error.message) : null;
}

export async function myThreads(): Promise<Thread[]> {
  const { data } = await supabase().rpc("my_threads");
  return (data ?? []) as Thread[];
}

export async function threadWith(me: string, other: string): Promise<DirectMessage[]> {
  const { data } = await supabase().from("direct_messages").select("*")
    .or(`and(sender.eq.${me},recipient.eq.${other}),and(sender.eq.${other},recipient.eq.${me})`)
    .order("created_at", { ascending: true }).limit(500);
  return (data ?? []) as DirectMessage[];
}

export async function markRead(me: string, other: string): Promise<void> {
  await supabase().from("direct_messages").update({ read_at: new Date().toISOString() })
    .eq("recipient", me).eq("sender", other).is("read_at", null);
}

export async function sendDirect(me: string, other: string, body: string): Promise<string | null> {
  const { error } = await supabase().from("direct_messages").insert({ sender: me, recipient: other, body: body.trim() });
  if (error) return /row-level security/i.test(error.message) ? "You can write again once they reply." : friendly(error.message);
  // Tell their phone (the server checks it's real and doesn't buzz for every line of a burst).
  void authed("/api/push/dm", { to: other });
  return null;
}

export async function reportMessage(kind: "chat" | "dm", id: string, reason: string): Promise<string | null> {
  const res = await authed("/api/report", { messageKind: kind, messageId: id, reason });
  if (res?.ok) return null;
  return ((await res?.json().catch(() => ({}))) as { error?: string } | undefined)?.error ?? "Couldn't send the report. Try again.";
}

async function authed(path: string, body: object): Promise<Response | null> {
  const { data } = await supabase().auth.getSession();
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}) },
    body: JSON.stringify(body),
  }).catch(() => null);
}

function friendly(message: string): string {
  if (/keep it kind|slow down/i.test(message)) return message.replace(/^.*?(Keep it kind|Slow down)/i, "$1");
  if (/row-level security/i.test(message)) return "You can only talk here while something of theirs is on in your room.";
  if (/fetch|network/i.test(message)) return "Can't reach Bottega. Check your connection.";
  return "Couldn't send that. Try again.";
}

/** "now", "5 min", "2 h" */
export function ago(iso: string): string {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
