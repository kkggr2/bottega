import { notifyConfigured, notifyUsers } from "@/lib/notify";
import { callerId } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * POST /api/push/wall { kind: "note" | "rec", id } — called right after someone leaves a note on a wall
 * or a recommendation at a door. The server reads the row itself, checks the caller wrote it, and tells
 * the other person's phone. At most one push per pair of people every 10 minutes.
 */

const QUIET_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const db = supabaseAdmin();
  if (!db || !notifyConfigured()) return Response.json({ sent: 0, reason: "not set up" });
  const me = await callerId(db, request);
  if (!me) return new Response("Sign in first", { status: 401 });

  const { kind, id } = (await request.json().catch(() => ({}))) as { kind?: string; id?: string };
  if ((kind !== "note" && kind !== "rec" && kind !== "open") || !id || !/^[0-9a-f-]{36}$/.test(id)) return new Response("Bad request", { status: 400 });
  if (kind === "open") return opened(db, me, id);

  // The row, and who it's for.
  const row = kind === "note"
    ? (await db.from("notes").select("author, room_owner, created_at").eq("id", id).maybeSingle()).data as { author: string; room_owner: string; created_at: string } | null
    : (await db.from("recommendations").select("from_user, to_user, title, type, created_at, wrapped").eq("id", id).maybeSingle()).data as { from_user: string; to_user: string; title: string; type: string; created_at: string; wrapped: boolean } | null;
  if (!row) return Response.json({ sent: 0 });
  const from = "author" in row ? row.author : row.from_user;
  const to = "room_owner" in row ? row.room_owner : row.to_user;
  if (from !== me || to === me) return new Response("Not yours", { status: 403 });

  // Quiet if this person already sent another note or recommendation to them in the last 10 minutes.
  const since = new Date(new Date(row.created_at).getTime() - QUIET_MS).toISOString();
  const [{ count: notes }, { count: recs }] = await Promise.all([
    db.from("notes").select("id", { count: "exact", head: true }).eq("author", me).eq("room_owner", to).gte("created_at", since).neq("id", id),
    db.from("recommendations").select("id", { count: "exact", head: true }).eq("from_user", me).eq("to_user", to).gte("created_at", since).neq("id", id),
  ]);
  if ((notes ?? 0) + (recs ?? 0) > 0) return Response.json({ sent: 0, reason: "quiet" });

  const [{ data: sender }, { data: receiver }] = await Promise.all([
    db.from("profiles").select("username").eq("id", me).maybeSingle(),
    db.from("profiles").select("username").eq("id", to).maybeSingle(),
  ]);
  if (!sender || !receiver) return Response.json({ sent: 0 });

  const what = { song: "a song", poster: "a film", scene: "a scene", book: "a book" }[("type" in row ? row.type : "") as "song"] ?? "something";
  const body = "author" in row
    ? `@${sender.username} left a note on your wall`
    : "wrapped" in row && row.wrapped
      ? `@${sender.username} left you something wrapped. Unwrap it at your door.`
      : `@${sender.username} left you ${what}: ${"title" in row ? row.title : ""}`;
  const reached = await notifyUsers(db, [to], { title: "Bottega", body, url: `bottega://r/${receiver.username}` });
  return Response.json({ sent: reached.length });
}

/** A gift was unwrapped: tell the giver's phone, once. Only the person it was for can trigger this. */
async function opened(db: NonNullable<ReturnType<typeof supabaseAdmin>>, me: string, id: string) {
  const { data: row } = await db.from("recommendations").select("from_user, to_user, title, wrapped, opened_at").eq("id", id).maybeSingle();
  if (!row || row.to_user !== me || !row.wrapped || !row.opened_at) return Response.json({ sent: 0 });
  if (Date.now() - new Date(row.opened_at as string).getTime() > 5 * 60 * 1000) return Response.json({ sent: 0, reason: "old" });
  const { data: opener } = await db.from("profiles").select("username").eq("id", me).maybeSingle();
  if (!opener) return Response.json({ sent: 0 });
  const reached = await notifyUsers(db, [row.from_user as string], { title: "Bottega", body: `@${opener.username} unwrapped your gift: ${row.title}`, url: `bottega://r/${opener.username}` });
  return Response.json({ sent: reached.length });
}
