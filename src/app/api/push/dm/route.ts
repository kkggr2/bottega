import { notifyConfigured, notifyUsers } from "@/lib/notify";
import { callerId } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * POST /api/push/dm { to } — called by the app right after sending a private message.
 * Buzzes the other person's phone: "@ada: loved your Lynch poster". Everything is checked here:
 * the message must really exist and be new, and a burst of messages buzzes only once
 * (nothing if the sender already wrote to them in the 3 minutes before).
 */

export async function POST(request: Request) {
  const db = supabaseAdmin();
  if (!db || !notifyConfigured()) return Response.json({ sent: 0, reason: "not set up" });
  const me = await callerId(db, request);
  if (!me) return new Response("Sign in first", { status: 401 });
  const { to } = (await request.json().catch(() => ({}))) as { to?: string };
  if (!to || !/^[0-9a-f-]{36}$/.test(to)) return Response.json({ sent: 0 });

  const { data: recent } = await db.from("direct_messages").select("body, created_at")
    .eq("sender", me).eq("recipient", to).gte("created_at", new Date(Date.now() - 4 * 60e3).toISOString())
    .order("created_at", { ascending: false }).limit(2);
  const [last, before] = (recent ?? []) as { body: string; created_at: string }[];
  if (!last || Date.now() - Date.parse(last.created_at) > 60e3) return Response.json({ sent: 0 });
  if (before && Date.parse(last.created_at) - Date.parse(before.created_at) < 3 * 60e3) return Response.json({ sent: 0, reason: "burst" });

  const { data: who } = await db.from("profiles").select("username").eq("id", me).maybeSingle();
  if (!who) return Response.json({ sent: 0 });

  const username = who.username as string;
  const text = last.body.length > 120 ? `${last.body.slice(0, 117)}…` : last.body;
  const reached = await notifyUsers(db, [to], { title: "Bottega", body: `@${username}: ${text}`, url: `bottega://messages/${username}` });
  return Response.json({ sent: reached.length });
}
