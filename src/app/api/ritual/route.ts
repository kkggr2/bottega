import type { NextRequest } from "next/server";
import { meetingWhen } from "@/lib/club-time";
import { notifyConfigured, notifyUsers } from "@/lib/notify";
import { quizFor, today } from "@/lib/quiz/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * GET /api/ritual — run once a day by Vercel Cron (see vercel.json).
 * Your record, film and book can each change once every 24 hours. When one has opened up again,
 * your phone gets one quiet line: "Your turntable is free again. What are you playing today?"
 * Only for people who used it in the last week, and at most once a day.
 * Anyone else who used Bottega in the last two weeks and hasn't played today gets today's quiz instead.
 * Clubs: everyone who hasn't said "can't come" is reminded of a meeting the day before.
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

  // Meetings tomorrow: a reminder to everyone who hasn't said they can't come.
  let reminded = 0;
  const { data: due } = await db.rpc("due_meeting_reminders");
  for (const m of (due ?? []) as { slug: string; club_name: string; starts_at: string; place: string; tz: string; users: string[] }[]) {
    const where = m.place ? ` · ${m.place}` : "";
    reminded += (await notifyUsers(db, m.users, {
      title: m.club_name,
      body: `Coming up: ${meetingWhen(m.starts_at, m.tz)}${where}. Still coming?`,
      url: `bottega://club/${m.slug}`,
    })).length;
  }

  const { data, error } = await db.rpc("ritual_targets");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const targets = (data ?? []) as { user_id: string; slots: string[] }[];

  // Same message for everyone with the same open slots, so send in groups (one per person, whatever their devices).
  const groups = new Map<string, Set<string>>();
  for (const t of targets) {
    const key = [...t.slots].sort().join(",");
    groups.set(key, (groups.get(key) ?? new Set()).add(t.user_id));
  }
  let sent = 0;
  for (const [key, users] of groups) {
    sent += (await notifyUsers(db, [...users], { title: "Bottega", body: line(key.split(",")), url: "bottega://room" })).length;
  }

  // Everyone else who's been around lately and hasn't played: today's quiz. Still one line a day at most.
  const told = new Set(targets.map((t) => t.user_id));
  const day = today();
  const { data: quizData } = await db.rpc("quiz_nudge_targets", { p_day: day });
  const quizUsers = [...new Set(((quizData ?? []) as { user_id: string }[]).map((t) => t.user_id).filter((u) => !told.has(u)))];
  let quizSent = 0;
  if (quizUsers.length) {
    const quiz = quizFor(day);
    quizSent = (await notifyUsers(db, quizUsers, {
      title: "Bottega",
      body: `Today's quiz: ${quiz.title}. ${quiz.qs.length} questions, about 2 minutes.`,
      url: "bottega://quiz",
    })).length;
  }
  return Response.json({ sent, quizSent, reminded });
}
