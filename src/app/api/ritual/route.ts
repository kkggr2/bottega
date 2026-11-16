import type { NextRequest } from "next/server";
import { apnsConfigured, sendApns } from "@/lib/apns";
import { quizFor, today } from "@/lib/quiz/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * GET /api/ritual — run once a day by Vercel Cron (see vercel.json).
 * Your record, film and book can each change once every 24 hours. When one has opened up again,
 * your phone gets one quiet line: "Your turntable is free again. What are you playing today?"
 * Only for people who used it in the last week, and at most once a day.
 * Anyone else who used Bottega in the last two weeks and hasn't played today gets today's quiz instead.
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

  if (!apnsConfigured()) return Response.json({ sent: 0, reason: "no push" });
  const { data, error } = await db.rpc("ritual_targets");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const targets = ((data ?? []) as { user_id: string; token: string; platform: string; slots: string[] }[])
    .filter((t) => t.platform === "ios");

  // Same message for everyone with the same open slots, so send in groups.
  const groups = new Map<string, string[]>();
  for (const t of targets) {
    const key = [...t.slots].sort().join(",");
    groups.set(key, [...(groups.get(key) ?? []), t.token]);
  }
  let sent = 0;
  for (const [key, tokens] of groups) {
    const results = await sendApns(tokens, { title: "Bottega", body: line(key.split(",")), url: "bottega://room" });
    sent += results.filter((r) => r.ok).length;
    await Promise.all(results.filter((r) => r.gone).map((r) => db.rpc("drop_push_token", { p_token: r.token })));
  }

  // Everyone else who's been around lately and hasn't played: today's quiz. Still one line a day at most.
  const told = new Set(targets.map((t) => t.user_id));
  const day = today();
  const { data: quizData } = await db.rpc("quiz_nudge_targets", { p_day: day });
  const quizTokens = ((quizData ?? []) as { user_id: string; token: string; platform: string }[])
    .filter((t) => t.platform === "ios" && !told.has(t.user_id)).map((t) => t.token);
  let quizSent = 0;
  if (quizTokens.length) {
    const quiz = quizFor(day);
    const results = await sendApns(quizTokens, {
      title: "Bottega",
      body: `Today's quiz: ${quiz.title}. ${quiz.qs.length} questions, about 2 minutes.`,
      url: "bottega://quiz",
    });
    quizSent = results.filter((r) => r.ok).length;
    await Promise.all(results.filter((r) => r.gone).map((r) => db.rpc("drop_push_token", { p_token: r.token })));
  }
  return Response.json({ sent, quizSent });
}
