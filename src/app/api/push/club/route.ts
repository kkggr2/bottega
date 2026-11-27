import { meetingWhen } from "@/lib/club-time";
import { notifyConfigured, notifyUsers } from "@/lib/notify";
import { callerId } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * POST /api/push/club { clubId, kind } — called right after something happens in a club:
 *   message  a chat message (members hear at most once every 30 minutes per club, so a busy evening is one buzz)
 *   poll     a new vote on what's next
 *   meeting  a new or moved meeting
 *   reading  a new book to read, or film to watch
 *   pin      a new note from the host, pinned at the top of the club
 * The server reads what happened itself and checks the caller did it. Muted members aren't told.
 */

const QUIET: Record<string, string> = { message: "30 minutes", poll: "1 minute", meeting: "1 minute", reading: "1 minute", pin: "1 minute" };
const FRESH_MS = 2 * 60 * 1000;
const fresh = (iso?: string | null) => Boolean(iso && Date.now() - Date.parse(iso) < FRESH_MS);
/** One clean line for the lock screen: line breaks become spaces, and long text ends in "…". */
const clip = (s: string, n: number) => {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat;
};

export async function POST(request: Request) {
  const db = supabaseAdmin();
  if (!db || !notifyConfigured()) return Response.json({ sent: 0, reason: "not set up" });
  const me = await callerId(db, request);
  if (!me) return new Response("Sign in first", { status: 401 });

  const { clubId, kind } = (await request.json().catch(() => ({}))) as { clubId?: string; kind?: string };
  if (!clubId || !/^[0-9a-f-]{36}$/.test(clubId) || !kind || !(kind in QUIET)) return new Response("Bad request", { status: 400 });

  const [{ data: club }, { data: member }, { data: who }] = await Promise.all([
    db.from("clubs").select("*").eq("id", clubId).maybeSingle(),
    db.from("club_members").select("role").eq("club_id", clubId).eq("user_id", me).maybeSingle(),
    db.from("profiles").select("username").eq("id", me).maybeSingle(),
  ]);
  if (!club || !member || !who) return new Response("Not in this club", { status: 403 });
  const isHost = club.host === me || member.role === "cohost";
  const name = club.name as string;

  let body: string | null = null;
  if (kind === "message") {
    const { data } = await db.from("chat_messages").select("body, created_at").eq("room_key", `club:${club.slug}`).eq("author", me)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data && fresh(data.created_at as string)) body = `@${who.username}: ${clip(data.body as string, 120)}`;
  } else if (isHost && kind === "poll") {
    const { data } = await db.from("club_polls").select("question, created_at").eq("club_id", clubId).is("closed_at", null).maybeSingle();
    if (data && fresh(data.created_at as string)) body = `New vote: ${clip(data.question as string, 100)} Tap to choose.`;
  } else if (isHost && kind === "meeting") {
    const { data } = await db.from("club_meetings").select("starts_at, place, tz, created_at").eq("club_id", clubId)
      .gt("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle();
    if (data) body = `Meeting: ${meetingWhen(data.starts_at as string, data.tz as string)}${data.place ? ` · ${clip(data.place as string, 60)}` : ""}. Are you coming?`;
  } else if (isHost && kind === "reading") {
    const { data } = await db.from("club_readings").select("title, kind, started_at").eq("club_id", clubId).is("finished_at", null).maybeSingle();
    if (data && fresh(data.started_at as string)) {
      body = data.kind === "film"
        ? `Now watching: ${clip(data.title as string, 100)}. Tap Watch along when you press play.`
        : `Now reading: ${clip(data.title as string, 100)}`;
    }
  } else if (isHost && kind === "pin") {
    if (club.pinned_note && fresh(club.pinned_at as string)) body = `📌 ${clip(club.pinned_note as string, 140)}`;
  }
  if (!body) return Response.json({ sent: 0 });

  const { data: targets, error } = await db.rpc("club_notify_targets", { p_club: clubId, p_sender: me, p_kind: kind, p_quiet: QUIET[kind] });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const ids = ((targets ?? []) as { user_id: string }[]).map((t) => t.user_id);
  if (!ids.length) return Response.json({ sent: 0 });

  const reached = await notifyUsers(db, ids, { title: name, body, url: `bottega://club/${club.slug}` });
  if (reached.length) await db.rpc("log_club_push", { p_club: clubId, p_kind: kind, p_users: reached });
  return Response.json({ sent: reached.length });
}
