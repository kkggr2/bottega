import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BANK } from "./bank";
import type { Quiz } from "./bank-types";
import { CLUB_QUIZZES } from "./club-quizzes";
import { MEDIA } from "./media";
import { limitFor, QUIZ_LIMIT_MS, type AnswerResult, type BoardRow, type ClubQuizCard, type QuizQuestion, type QuizState } from "./types";

/*
 * The quizzes, run on the server: which quiz it is, the order each person sees the options in,
 * timing and marking. Two kinds share one engine:
 * - the daily quiz: the same for everyone each day (UTC); the bank repeats once it runs out
 * - club quizzes: written for one club (club-quizzes.ts), for its members only, one try each
 */

const FIRST_DAY = Date.UTC(2026, 10, 14);
/** A little slack for the network, on top of the 15 seconds. */
const GRACE_MS = 1500;
/** The next question's clock starts after the "right / wrong" moment, so nobody loses time reading it. */
export const FEEDBACK_MS = 1800;
/** The first question's clock starts a moment after "Start", so the trip back to the phone doesn't eat into it. */
const START_MS = 1200;

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
  user_id: string; quiz_id: string; q_index: number; q_started_at: string;
  correct: number; score: number; time_ms: number; answers: unknown[]; finished_at: string | null;
};

/** Where one quiz's tries are kept and ranked. */
type Track = {
  quiz: Quiz;
  /** The quiz id stored on the row: the quiz's own id for the daily one, "club/quiz" for a club's. */
  rowQuizId: string;
  table: "quiz_attempts" | "club_quiz_attempts";
  /** The columns that pick this quiz's row for a person, besides user_id. */
  key: Record<string, string>;
  /** Extra columns for a new row. */
  insert: Record<string, string>;
  board: { fn: "quiz_board" | "club_quiz_board"; args: Record<string, unknown> };
  day: string;
  next: string;
  club?: QuizState["club"];
};

function dailyTrack(): Track {
  const day = today();
  const quiz = quizFor(day);
  return {
    quiz, rowQuizId: quiz.id, table: "quiz_attempts", key: { day }, insert: { quiz_id: quiz.id },
    board: { fn: "quiz_board", args: { p_day: day, p_limit: 20 } },
    day, next: quizFor(today(Date.parse(`${day}T00:00:00Z`) + 864e5)).title,
  };
}

/** A club's quizzes, newest first: its own, then the starter quiz every club gets. Hidden until their day. */
function quizzesFor(clubSlug: string) {
  const open = (c: (typeof CLUB_QUIZZES)[number]) => !c.opens || c.opens <= today();
  return [
    ...CLUB_QUIZZES.filter((c) => c.club === clubSlug && open(c)).reverse(),
    ...CLUB_QUIZZES.filter((c) => c.club === "*" && open(c)),
  ];
}

/** A club quiz, if it exists and this person is in the club. */
async function clubTrack(db: SupabaseClient, userId: string, clubSlug: string, quizId: string): Promise<Track | null> {
  const entry = quizzesFor(clubSlug).find((c) => c.quiz.id === quizId);
  if (!entry) return null;
  const rowQuizId = `${clubSlug}/${quizId}`;
  const { data: club } = await db.from("clubs").select("id, slug, name, emoji").eq("slug", clubSlug).maybeSingle();
  if (!club) return null;
  const { data: member } = await db.from("club_members").select("user_id").eq("club_id", club.id).eq("user_id", userId).maybeSingle();
  if (!member) return null;
  return {
    quiz: entry.quiz, rowQuizId, table: "club_quiz_attempts", key: { quiz_id: rowQuizId }, insert: { club_id: club.id as string },
    board: { fn: "club_quiz_board", args: { p_quiz: rowQuizId, p_limit: 50 } },
    day: today(), next: "",
    club: { slug: club.slug as string, name: club.name as string, emoji: club.emoji as string },
  };
}

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

async function load(db: SupabaseClient, userId: string, t: Track): Promise<Attempt | null> {
  let query = db.from(t.table).select("*").eq("user_id", userId);
  for (const [k, v] of Object.entries(t.key)) query = query.eq(k, v);
  const { data } = await query.maybeSingle();
  return (data as Attempt | null) ?? null;
}

async function board(db: SupabaseClient, t: Track, userId: string, mine: Attempt | null): Promise<{ rows: BoardRow[]; me: BoardRow | null }> {
  const { data } = await db.rpc(t.board.fn, t.board.args);
  const rows = ((data ?? []) as { rank: number; user_id: string; username: string; score: number; correct: number; time_ms: number }[])
    .map((r) => ({ rank: Number(r.rank), username: r.username, score: r.score, correct: r.correct, timeMs: r.time_ms, me: r.user_id === userId }));
  let me = rows.find((r) => r.me) ?? null;
  if (!me && mine?.finished_at) {
    let query = db.from(t.table).select("user_id", { count: "exact", head: true }).not("finished_at", "is", null)
      .or(`score.gt.${mine.score},and(score.eq.${mine.score},time_ms.lt.${mine.time_ms})`);
    for (const [k, v] of Object.entries(t.key)) query = query.eq(k, v);
    const { count } = await query;
    const { data: p } = await db.from("profiles").select("username").eq("id", userId).maybeSingle();
    me = { rank: (count ?? 0) + 1, username: (p?.username as string) ?? "you", score: mine.score, correct: mine.correct, timeMs: mine.time_ms, me: true };
  }
  return { rows, me };
}

async function stateOf(db: SupabaseClient, userId: string, t: Track, a: Attempt | null, withBoard = true): Promise<QuizState> {
  // Mid-quiz the high score table isn't shown, so skip it and answer faster.
  const b = withBoard ? await board(db, t, userId, a) : { rows: [], me: null };
  return {
    day: t.day,
    quiz: { id: t.quiz.id, title: t.quiz.title, blurb: t.quiz.blurb, count: t.quiz.qs.length, limitMs: QUIZ_LIMIT_MS },
    next: t.next,
    attempt: a ? { done: Boolean(a.finished_at), index: a.q_index, correct: a.correct, score: a.score, timeMs: a.time_ms } : null,
    question: a ? question(t.quiz, userId, a) : null,
    board: b.rows,
    me: b.me,
    ...(t.club ? { club: t.club } : {}),
  };
}

async function start(db: SupabaseClient, userId: string, t: Track): Promise<QuizState> {
  let a = await load(db, userId, t);
  if (!a) {
    // Insert and read back in one trip; only if someone else just started it too do we load again.
    const { data } = await db.from(t.table).upsert(
      { user_id: userId, ...t.key, ...t.insert, q_started_at: new Date(Date.now() + START_MS).toISOString() },
      { onConflict: `user_id,${Object.keys(t.key).join(",")}`, ignoreDuplicates: true },
    ).select("*").maybeSingle();
    a = (data as Attempt | null) ?? (await load(db, userId, t));
  }
  // Away too long on the current question: it counts as unanswered, and the next one starts now.
  if (a && !a.finished_at && Date.now() - Date.parse(a.q_started_at) > limitFor(kindOf(t.quiz.qs[a.q_index])) + GRACE_MS) {
    await answer(db, userId, t, a.q_index, null);
    a = await load(db, userId, t);
  }
  // Mid-quiz the high score table isn't shown: skip it so the first question arrives sooner.
  return stateOf(db, userId, t, a, Boolean(a?.finished_at));
}

async function answer(db: SupabaseClient, userId: string, t: Track, index: number, choice: number | null): Promise<AnswerResult | { error: string; state: QuizState }> {
  const quiz = t.quiz;
  const a = await load(db, userId, t);
  if (!a || a.finished_at || a.q_index !== index || a.quiz_id !== t.rowQuizId) {
    return { error: "That question is over.", state: await stateOf(db, userId, t, a) };
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
  let update = db.from(t.table).update({
    q_index: index + 1,
    q_started_at: nextStarts,
    correct: a.correct + (correct ? 1 : 0),
    score: a.score + got,
    time_ms: a.time_ms + Math.min(elapsed, limit),
    answers: [...(a.answers ?? []), { q: index, choice: choice == null ? null : shown[choice], ms: elapsed }],
    finished_at: last ? now : null,
  }).eq("user_id", userId).eq("q_index", index);
  for (const [k, v] of Object.entries(t.key)) update = update.eq(k, v);
  const { data: moved } = await update.select("*").maybeSingle();

  const after = (moved as Attempt | null) ?? (await load(db, userId, t));
  return {
    correct,
    answer: shown.indexOf(q.a),
    note: q.n ?? null,
    points: got,
    state: await stateOf(db, userId, t, after, Boolean(after?.finished_at)),
  };
}

// --- The daily quiz ---------------------------------------------------------------------------

export async function quizState(db: SupabaseClient, userId: string): Promise<QuizState> {
  const t = dailyTrack();
  return stateOf(db, userId, t, await load(db, userId, t));
}

/** Start today's quiz (once), or pick up where you left off. The clock doesn't stop if you leave. */
export async function startQuiz(db: SupabaseClient, userId: string): Promise<QuizState> {
  return start(db, userId, dailyTrack());
}

export async function answerQuiz(db: SupabaseClient, userId: string, index: number, choice: number | null) {
  return answer(db, userId, dailyTrack(), index, choice);
}

// --- Club quizzes -----------------------------------------------------------------------------

const NOT_FOUND = { error: "This quiz is only for the club's members." } as const;

export async function clubQuizState(db: SupabaseClient, userId: string, club: string, quizId: string) {
  const t = await clubTrack(db, userId, club, quizId);
  return t ? stateOf(db, userId, t, await load(db, userId, t)) : NOT_FOUND;
}

export async function startClubQuiz(db: SupabaseClient, userId: string, club: string, quizId: string) {
  const t = await clubTrack(db, userId, club, quizId);
  return t ? start(db, userId, t) : NOT_FOUND;
}

export async function answerClubQuiz(db: SupabaseClient, userId: string, club: string, quizId: string, index: number, choice: number | null) {
  const t = await clubTrack(db, userId, club, quizId);
  return t ? answer(db, userId, t, index, choice) : NOT_FOUND;
}

/** A club's quizzes, newest first, with this member's result on each. Only for members. */
export async function clubQuizList(db: SupabaseClient, userId: string, clubSlug: string): Promise<ClubQuizCard[] | null> {
  const { data: club } = await db.from("clubs").select("id").eq("slug", clubSlug).maybeSingle();
  if (!club) return null;
  const { data: member } = await db.from("club_members").select("user_id").eq("club_id", club.id).eq("user_id", userId).maybeSingle();
  if (!member) return null;
  const entries = quizzesFor(clubSlug);
  if (!entries.length) return [];
  const rowId = (id: string) => `${clubSlug}/${id}`;
  const ids = entries.map((e) => rowId(e.quiz.id));
  const [{ data: mine }, { data: all }] = await Promise.all([
    db.from("club_quiz_attempts").select("quiz_id, score, correct, finished_at").eq("user_id", userId).in("quiz_id", ids),
    db.from("club_quiz_attempts").select("quiz_id").in("quiz_id", ids).not("finished_at", "is", null),
  ]);
  return entries.map((e) => {
    const m = (mine ?? []).find((x) => x.quiz_id === rowId(e.quiz.id));
    return {
      id: e.quiz.id, title: e.quiz.title, blurb: e.quiz.blurb, count: e.quiz.qs.length,
      played: (all ?? []).filter((x) => x.quiz_id === rowId(e.quiz.id)).length,
      mine: m ? { done: Boolean(m.finished_at), score: m.score as number, correct: m.correct as number } : null,
    };
  });
}
