import { createHash } from "node:crypto";
import { callerId } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * Invites that survive an App Store install.
 * POST /api/invite { action: "remember", club?, inviter? } — from a club or room link opened in a browser:
 *   keep "this network was invited" for one hour, under a salted hash of the address (never the address).
 * POST /api/invite { action: "claim" } — right after someone signs up in the app: hand back the most recent
 *   invite from their network in the last hour (and delete it), so they land in the club or get the friend request.
 */

const HOUR = 3600e3;

function addrHash(request: Request): string | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  if (!ip) return null;
  // The salt changes every day, so a hash can't be linked across days.
  const salt = `${process.env.CRON_SECRET ?? "bottega"}:${new Date().toISOString().slice(0, 10)}`;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function POST(request: Request) {
  const db = supabaseAdmin();
  if (!db) return Response.json({ ok: false });
  const body = (await request.json().catch(() => ({}))) as { action?: string; club?: string; inviter?: string };
  const addr = addrHash(request);
  if (!addr) return Response.json({ ok: false });
  const since = new Date(Date.now() - HOUR).toISOString();

  if (body.action === "remember") {
    const club = body.club && /^[a-z0-9-]{3,40}$/.test(body.club) ? body.club : null;
    const inviter = body.inviter && /^[a-z0-9_]{3,20}$/.test(body.inviter) ? body.inviter : null;
    if (!club && !inviter) return Response.json({ ok: false });
    await db.from("pending_invites").delete().lt("created_at", since);
    const { count } = await db.from("pending_invites").select("addr_hash", { count: "exact", head: true }).eq("addr_hash", addr);
    if ((count ?? 0) < 20) await db.from("pending_invites").insert({ addr_hash: addr, club_slug: club, inviter });
    return Response.json({ ok: true });
  }

  if (body.action === "claim") {
    if (!(await callerId(db, request))) return new Response("Sign in first", { status: 401 });
    const { data } = await db.from("pending_invites").select("club_slug, inviter")
      .eq("addr_hash", addr).gte("created_at", since).order("created_at", { ascending: false }).limit(1);
    await db.from("pending_invites").delete().eq("addr_hash", addr);
    const hit = data?.[0] as { club_slug: string | null; inviter: string | null } | undefined;
    return Response.json({ club: hit?.club_slug ?? null, inviter: hit?.inviter ?? null });
  }

  return Response.json({ ok: false }, { status: 400 });
}
