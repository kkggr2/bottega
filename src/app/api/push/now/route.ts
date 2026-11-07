import type { NextRequest } from "next/server";
import { apnsConfigured, sendApns } from "@/lib/apns";
import { joinDid, NOW_SLOTS, NOW_WORDS, nowAt, nowId } from "@/lib/now";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Room } from "@/lib/types";

/*
 * POST /api/push/now — called by the app right after someone puts something on.
 * Tells their friends' phones, combining everything they put out in the last 6 hours:
 * "@cagla put on Teardrop and left Normal People on the armchair".
 * The caller proves who they are with their own sign-in token; everything else is read on the server.
 */

const WINDOW_MS = 6 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const db = supabaseAdmin();
  if (!db || !apnsConfigured()) return Response.json({ sent: 0, reason: "not set up" });

  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const { data: auth } = await db.auth.getUser(token);
  const ownerId = auth.user?.id;
  if (!ownerId) return new Response("Sign in first", { status: 401 });

  const [{ data: room }, { data: profile }] = await Promise.all([
    db.from("rooms").select("*").eq("owner_id", ownerId).maybeSingle(),
    db.from("profiles").select("username").eq("id", ownerId).maybeSingle(),
  ]);
  if (!room || !profile) return Response.json({ sent: 0 });

  const r = room as Room;
  const recent = NOW_SLOTS
    .map((slot) => ({ slot, id: nowId(r, slot), at: nowAt(r, slot) }))
    .filter((x) => x.id && x.at && Date.now() - new Date(x.at).getTime() < WINDOW_MS)
    .sort((a, b) => b.at!.localeCompare(a.at!));
  if (!recent.length) return Response.json({ sent: 0 });

  const { data: pieces } = await db.from("pieces").select("id, title").in("id", recent.map((x) => x.id!));
  const titleOf = new Map((pieces ?? []).map((p) => [p.id as string, p.title as string]));
  const line = joinDid(recent.filter((x) => titleOf.has(x.id!)).map((x) => NOW_WORDS[x.slot].did(titleOf.get(x.id!)!)));
  if (!line) return Response.json({ sent: 0 });

  const { data: targets, error } = await db.rpc("push_targets", { p_owner: ownerId });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const ios = ((targets ?? []) as { recipient_id: string; token: string; platform: string }[]).filter((t) => t.platform === "ios");
  if (!ios.length) return Response.json({ sent: 0 });

  const username = profile.username as string;
  const results = await sendApns(ios.map((t) => t.token), {
    title: "Bottega",
    body: `@${username} ${line}`,
    url: `bottega://r/${username}`,
  });

  await Promise.all(results.filter((x) => x.gone).map((x) => db.rpc("drop_push_token", { p_token: x.token })));
  const reached = [...new Set(ios.filter((t) => results.find((x) => x.token === t.token)?.ok).map((t) => t.recipient_id))];
  if (reached.length) await db.rpc("log_push", { p_owner: ownerId, p_recipients: reached });
  return Response.json({ sent: reached.length, failed: results.filter((x) => !x.ok).length });
}
