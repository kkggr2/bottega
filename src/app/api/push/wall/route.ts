import { apnsConfigured, sendApns } from "@/lib/apns";
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
  if (!db || !apnsConfigured()) return Response.json({ sent: 0, reason: "not set up" });
  const me = await callerId(db, request);
  if (!me) return new Response("Sign in first", { status: 401 });

  const { kind, id } = (await request.json().catch(() => ({}))) as { kind?: string; id?: string };
  if ((kind !== "note" && kind !== "rec") || !id || !/^[0-9a-f-]{36}$/.test(id)) return new Response("Bad request", { status: 400 });

  // The row, and who it's for.
  const row = kind === "note"
    ? (await db.from("notes").select("author, room_owner, created_at").eq("id", id).maybeSingle()).data as { author: string; room_owner: string; created_at: string } | null
    : (await db.from("recommendations").select("from_user, to_user, title, type, created_at").eq("id", id).maybeSingle()).data as { from_user: string; to_user: string; title: string; type: string; created_at: string } | null;
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

  const [{ data: tokens }, { data: sender }, { data: receiver }] = await Promise.all([
    db.from("push_tokens").select("token, platform").eq("user_id", to),
    db.from("profiles").select("username").eq("id", me).maybeSingle(),
    db.from("profiles").select("username").eq("id", to).maybeSingle(),
  ]);
  const ios = (tokens ?? []).filter((t) => t.platform === "ios").map((t) => t.token as string);
  if (!ios.length || !sender || !receiver) return Response.json({ sent: 0 });

  const what = { song: "a song", poster: "a film", scene: "a scene", book: "a book" }[("type" in row ? row.type : "") as "song"] ?? "something";
  const body = "author" in row
    ? `@${sender.username} left a note on your wall`
    : `@${sender.username} left you ${what}: ${"title" in row ? row.title : ""}`;
  const results = await sendApns(ios, { title: "Bottega", body, url: `bottega://r/${receiver.username}` });
  await Promise.all(results.filter((x) => x.gone).map((x) => db.rpc("drop_push_token", { p_token: x.token })));
  return Response.json({ sent: results.filter((x) => x.ok).length });
}
