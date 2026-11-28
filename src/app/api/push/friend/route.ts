import { notifyConfigured, notifyUsers } from "@/lib/notify";
import { callerId } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * POST /api/push/friend { to, kind } — called by the app right after someone asks to swap keys ("request")
 * or accepts ("accepted"). Buzzes the other person: "@ada wants to swap keys with you", opening Ada's room,
 * where the Accept button is. Everything is checked here: the friendship must really be in that state (a request
 * only counts in the minutes after it was made), and each pair hears from this at most once every 6 hours,
 * so asking, cancelling and asking again can't be used to buzz someone over and over.
 */

const QUIET_MS = 6 * 60 * 60 * 1000;
const FRESH_MS = 3 * 60 * 1000;

export async function POST(request: Request) {
  const db = supabaseAdmin();
  if (!db || !notifyConfigured()) return Response.json({ sent: 0, reason: "not set up" });
  const me = await callerId(db, request);
  if (!me) return new Response("Sign in first", { status: 401 });
  const { to, kind } = (await request.json().catch(() => ({}))) as { to?: string; kind?: string };
  if (!to || !/^[0-9a-f-]{36}$/.test(to) || to === me || (kind !== "request" && kind !== "accepted")) return Response.json({ sent: 0 });

  // The friendship has to be what the caller says: their fresh request to `to`, or `to`'s request they just accepted.
  const { data: row } = kind === "request"
    ? await db.from("friendships").select("status, created_at").eq("requester", me).eq("addressee", to).maybeSingle()
    : await db.from("friendships").select("status, created_at").eq("requester", to).eq("addressee", me).maybeSingle();
  if (!row) return Response.json({ sent: 0 });
  if (kind === "request" && (row.status !== "pending" || Date.now() - Date.parse(row.created_at as string) > FRESH_MS)) return Response.json({ sent: 0 });
  if (kind === "accepted" && row.status !== "accepted") return Response.json({ sent: 0 });

  const { data: last } = await db.from("push_log").select("sent_at").eq("owner_id", me).eq("recipient_id", to).maybeSingle();
  if (last && Date.now() - Date.parse(last.sent_at as string) < QUIET_MS) return Response.json({ sent: 0, reason: "quiet" });

  const { data: who } = await db.from("profiles").select("username").eq("id", me).maybeSingle();
  if (!who) return Response.json({ sent: 0 });
  const username = who.username as string;
  const body = kind === "request"
    ? `@${username} wants to swap keys with you.`
    : `@${username} swapped keys with you. Step into their room.`;

  const reached = await notifyUsers(db, [to], { title: "Bottega", body, url: `bottega://r/${username}` });
  if (reached.length) await db.rpc("log_push", { p_owner: me, p_recipients: reached });
  return Response.json({ sent: reached.length });
}
