import type { NextRequest } from "next/server";
import { meetingWhen } from "@/lib/club-time";
import { notifyConfigured, notifyUsers, type Note } from "@/lib/notify";
import { quizFor, today } from "@/lib/quiz/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * GET /api/ritual — run once a day by Vercel Cron (see vercel.json).
 * Your record, film and book can each change once every 24 hours. When one has opened up again,
 * your phone gets one quiet line: "Your turntable is free again. What are you playing today?"
 * Only for people who used it in the last week, and at most once a day.
 * Anyone else who used Bottega in the last two weeks and hasn't played today gets today's quiz instead.
 * Clubs: everyone who hasn't said "can't come" is reminded of a meeting the day before.
 * Never more than one line a day per person: a meeting reminder first, then their best news
 * (new notes they can read, a vote, someone asking to swap keys, visitors), then the free turntable, then the quiz.
 */

const WHERE: Record<string, string> = { song: "turntable", film: "TV", book: "armchair" };

function line(slots: string[]): string {
  const places = slots.map((s) => WHERE[s]).filter(Boolean);
  if (places.length === 3) return "Your turntable, TV and armchair are free again. What's on today?";
  if (places.length === 2) return `Your ${places[0]} and ${places[1]} are free again. What's on today?`;
  const one = slots[0];
  return one === "song" ? "Your turntable is free again. What are you playing today?"
    : one === "film" ? "Your TV is free again. Which film tonight?"
    : "Your armchair is free again. What are you reading today?";
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Not allowed", { status: 401 });
  }
  const db = supabaseAdmin();
  if (!db) return Response.json({ sent: 0, reason: "not set up" });

  // Chat rooms last a day; clear out anything older than two (reports keep their own copy).
  await db.rpc("purge_chat");

  if (!notifyConfigured()) return Response.json({ sent: 0, reason: "no push" });

  // One line a day at most per person: the first of these that applies.
  const told = new Set<string>();
  const tell = async (users: string[], note: Note) => {
    const fresh = [...new Set(users)].filter((u) => !told.has(u));
    if (!fresh.length) return 0;
    for (const u of fresh) told.add(u); // Even if their phone is off: don't stack a second line on them today.
    return (await notifyUsers(db, fresh, note)).length;
  };
  const sent: Record<string, number> = {};
  const count = (kind: string, n: number) => { sent[kind] = (sent[kind] ?? 0) + n; };

  // 1. A club meeting tomorrow, to everyone who hasn't said they can't come.
  const { data: due } = await db.rpc("due_meeting_reminders");
  for (const m of (due ?? []) as { slug: string; club_name: string; starts_at: string; place: string; tz: string; users: string[] }[]) {
    const where = m.place ? ` · ${m.place}` : "";
    count("meeting", await tell(m.users, {
      title: m.club_name,
      body: `Coming up: ${meetingWhen(m.starts_at, m.tz)}${where}. Still coming?`,
      url: `bottega://club/${m.slug}`,
    }));
  }

  // 2. Each person's best news: new notes they can read, a vote, a friend request, visitors.
  const { data: news } = await db.rpc("daily_note_candidates");
  for (const c of (news ?? []) as Candidate[]) {
    const note = candidateNote(c);
    if (note) count(c.kind, await tell([c.user_id], note));
  }

  // 3. "Your turntable is free again": for people who used it in the last week.
  const { data, error } = await db.rpc("ritual_targets");
  if (error) return Response.json({ error: error.message, sent }, { status: 500 });
  const groups = new Map<string, Set<string>>();
  for (const t of (data ?? []) as { user_id: string; slots: string[] }[]) {
    const key = [...t.slots].sort().join(",");
    groups.set(key, (groups.get(key) ?? new Set()).add(t.user_id));
  }
  for (const [key, users] of groups) {
    count("free", await tell([...users], { title: "Bottega", body: line(key.split(",")), url: "bottega://room" }));
  }

  // 4. Anyone else who's been around lately and hasn't played: today's quiz.
  const day = today();
  const { data: quizData } = await db.rpc("quiz_nudge_targets", { p_day: day });
  const quizUsers = ((quizData ?? []) as { user_id: string }[]).map((t) => t.user_id);
  if (quizUsers.length) {
    const quiz = quizFor(day);
    count("quiz", await tell(quizUsers, {
      title: "Bottega",
      body: `Today's quiz: ${quiz.title}. ${quiz.qs.length} questions, about 2 minutes.`,
      url: "bottega://quiz",
    }));
  }
  return Response.json({ sent });
}

type Candidate = { user_id: string; kind: "club_notes" | "club_vote" | "request" | "visits"; n: number; label: string | null; slug: string | null };

/** The line for each kind of news. Plain and specific: what happened, and where tapping leads. */
function candidateNote(c: Candidate): Note | null {
  const n = c.n;
  switch (c.kind) {
    case "club_notes":
      return c.slug ? {
        title: c.label ?? "Your club",
        body: n === 1 ? "A new note, up to where you are. Nothing ahead of you is shown." : `${n} new notes, up to where you are. Nothing ahead of you is shown.`,
        url: `bottega://club/${c.slug}`,
      } : null;
    case "club_vote":
      return c.slug ? { title: c.label ?? "Your club", body: "There's a vote on what's next, and you haven't picked yet.", url: `bottega://club/${c.slug}` } : null;
    case "request":
      return {
        title: "Bottega",
        body: n === 1 ? `@${c.label} wants to swap keys with you.` : `@${c.label} and ${n - 1} more want to swap keys with you.`,
        url: "bottega://room",
      };
    case "visits":
      return {
        title: "Bottega",
        body: n === 1 ? "Someone stepped into your room since yesterday." : `${n} people stepped into your room since yesterday.`,
        url: "bottega://room",
      };
    default:
      return null;
  }
}
