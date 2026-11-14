import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BANK } from "./bank";
import type { Quiz } from "./bank-types";
import { MEDIA } from "./media";
import { limitFor, QUIZ_LIMIT_MS, type AnswerResult, type BoardRow, type QuizQuestion, type QuizState } from "./types";

/*
 * The daily quiz, run on the server: which quiz is on today, the order each person sees the
 * options in, timing and marking. Everyone gets the same quiz each day (UTC); the bank repeats
 * once it runs out, so keep adding to it.
 */

const FIRST_DAY = Date.UTC(2026, 10, 14);
/** A little slack for the network, on top of the 15 seconds. */
const GRACE_MS = 1500;
/** The next question's clock starts after the "right / wrong" moment, so nobody loses time reading it. */
export const FEEDBACK_MS = 1800;

export function today(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function quizFor(day: string): Quiz {
  const n = Math.floor((Date.parse(`${day}T00:00:00Z`) - FIRST_DAY) / 864e5);
  return BANK[((n % BANK.length) + BANK.length) % BANK.length];
}

/** The order this person sees the four options in, the same every time they ask. */
function order(userId: string, quizId: string, index: number): number[] {
  let h = 2166136261;
  for (const c of `${userId}:${quizId}:${index}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const out = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function points(elapsed: number, limit: number): number {
  return 100 + Math.round((50 * Math.max(0, limit - elapsed)) / limit);
}

const kindOf = (q: Quiz["qs"][number]) => q.kind ?? "fact";

type Attempt = {
  user_id: string; day: string; quiz_id: string; q_index: number; q_started_at: string;
  correct: number; score: number; time_ms: number; answers: unknown[]; finished_at: string | null;
};

function question(quiz: Quiz, userId: string, a: Attempt): QuizQuestion | null {
  if (a.finished_at || a.q_index >= quiz.qs.length) return null;
  const q = quiz.qs[a.q_index];
  const kind = kindOf(q);
  const limitMs = limitFor(kind);
  const shown = order(userId, quiz.id, a.q_index).map((i) => q.o[i]);
  const remainingMs = limitMs - Math.max(0, Date.now() - Date.parse(a.q_started_at));
  const media = q.media ? MEDIA[q.media] : undefined;
  return {
    index: a.q_index, text: q.q, options: shown, remainingMs: Math.max(0, remainingMs), limitMs, kind,
    // A palette question shows only the colours, never the picture they came from.
    ...(media && kind !== "palette" ? { image: media.img } : {}),
    ...(media && kind === "palette" ? { palette: media.palette } : {}),
    ...(q.crop ? { crop: q.crop } : {}),
    ...(q.quote ? { quote: q.quote } : {}),
    ...(q.emoji ? { emoji: q.emoji } : {}),
  };
}

async function board(db: SupabaseClient, day: string, userId: string, mine: Attempt | null): Promise<{ rows: BoardRow[]; me: BoardRow | null }> {
  const { data } = await db.rpc("quiz_board", { p_day: day, p_limit: 20 });
  const rows = ((data ?? []) as { rank: number; user_id: string; username: string; score: number; correct: number; time_ms: number }[])
    .map((r) => ({ rank: Number(r.rank), username: r.username, score: r.score, correct: r.correct, timeMs: r.time_ms, me: r.user_id === userId }));
  let me = rows.find((r) => r.me) ?? null;
  if (!me && mine?.finished_at) {
    const { count } = await db.from("quiz_attempts").select("user_id", { count: "exact", head: true })
      .eq("day", day).not("finished_at", "is", null)
      .or(`score.gt.${mine.score},and(score.eq.${mine.score},time_ms.lt.${mine.time_ms})`);
    const { data: p } = await db.from("profiles").select("username").eq("id", userId).maybeSingle();
    me = { rank: (count ?? 0) + 1, username: (p?.username as string) ?? "you", score: mine.score, correct: mine.correct, timeMs: mine.time_ms, me: true };
  }
  return { rows, me };
}

async function load(db: SupabaseClient, userId: string, day: string): Promise<Attempt | null> {
  const { data } = await db.from("quiz_attempts").select("*").eq("user_id", userId).eq("day", day).maybeSingle();
  return (data as Attempt | null) ?? null;
}

async function stateOf(db: SupabaseClient, userId: string, day: string, a: Attempt | null, withBoard = true): Promise<QuizState> {
  const quiz = quizFor(day);
  const tomorrow = quizFor(today(Date.parse(`${day}T00:00:00Z`) + 864e5));
  // Mid-quiz the high score table isn't shown, so skip it and answer faster.
  const b = withBoard ? await board(db, day, userId, a) : { rows: [], me: null };
  return {
    day,
    quiz: { id: quiz.id, title: quiz.title, blurb: quiz.blurb, count: quiz.qs.length, limitMs: QUIZ_LIMIT_MS },
    next: tomorrow.title,
    attempt: a ? { done: Boolean(a.finished_at), index: a.q_index, correct: a.correct, score: a.score, timeMs: a.time_ms } : null,
    question: a ? question(quiz, userId, a) : null,
    board: b.rows,
    me: b.me,
  };
}

export async function quizState(db: SupabaseClient, userId: string): Promise<QuizState> {
  const day = today();
  return stateOf(db, userId, day, await load(db, userId, day));
}

/** Start today's quiz (once), or pick up where you left off. The clock doesn't stop if you leave. */
export async function startQuiz(db: SupabaseClient, userId: string): Promise<QuizState> {
  const day = today();
  const quiz = quizFor(day);
  let a = await load(db, userId, day);
  if (!a) {
    await db.from("quiz_attempts").upsert(
      { user_id: userId, day, quiz_id: quiz.id, q_started_at: new Date().toISOString() },
      { onConflict: "user_id,day", ignoreDuplicates: true },
    );
    a = await load(db, userId, day);
  }
  // Away too long on the current question: it counts as unanswered, and the next one starts now.
  if (a && !a.finished_at && Date.now() - Date.parse(a.q_started_at) > limitFor(kindOf(quiz.qs[a.q_index])) + GRACE_MS) {
    await answerQuiz(db, userId, a.q_index, null);
    a = await load(db, userId, day);
  }
  return stateOf(db, userId, day, a);
}

export async function answerQuiz(db: SupabaseClient, userId: string, index: number, choice: number | null): Promise<AnswerResult | { error: string; state: QuizState }> {
  const day = today();
  const quiz = quizFor(day);
  const a = await load(db, userId, day);
  if (!a || a.finished_at || a.q_index !== index || a.quiz_id !== quiz.id) {
    return { error: "That question is over.", state: await stateOf(db, userId, day, a) };
  }
  const q = quiz.qs[index];
  const shown = order(userId, quiz.id, index);
  const elapsed = Math.max(0, Date.now() - Date.parse(a.q_started_at));
  const limit = limitFor(kindOf(q));
  const inTime = elapsed <= limit + GRACE_MS;
  const correct = inTime && choice != null && shown[choice] === q.a;
  const got = correct ? points(elapsed, limit) : 0;
  const last = index + 1 >= quiz.qs.length;
  const now = new Date().toISOString();
  const nextStarts = new Date(Date.now() + FEEDBACK_MS).toISOString();

  // Only counts once: the row moves on only if it's still on this question.
  const { data: moved } = await db.from("quiz_attempts").update({
    q_index: index + 1,
    q_started_at: nextStarts,
    correct: a.correct + (correct ? 1 : 0),
    score: a.score + got,
    time_ms: a.time_ms + Math.min(elapsed, limit),
    answers: [...(a.answers ?? []), { q: index, choice: choice == null ? null : shown[choice], ms: elapsed }],
    finished_at: last ? now : null,
  }).eq("user_id", userId).eq("day", day).eq("q_index", index).select("*").maybeSingle();

  const after = (moved as Attempt | null) ?? (await load(db, userId, day));
  return {
    correct,
    answer: shown.indexOf(q.a),
    note: q.n ?? null,
    points: got,
    state: await stateOf(db, userId, day, after, Boolean(after?.finished_at)),
  };
}
