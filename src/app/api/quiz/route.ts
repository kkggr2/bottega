import {
  answerClubQuiz, answerQuiz, clubQuizList, clubQuizState, quizState, startClubQuiz, startQuiz,
} from "@/lib/quiz/server";
import { callerIdQuick } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * The quizzes.
 * Daily (everyone):
 *   GET  /api/quiz                                        → today's quiz, your progress and the high score table
 *   POST /api/quiz { action: "start" }                    → start (or pick up) today's quiz
 *   POST /api/quiz { action: "answer", index, choice }    → answer the current question (choice null = time ran out)
 * A club's own quizzes (members only): add club (its link name) and quiz (the quiz's id):
 *   GET  /api/quiz?club=gray-fox                          → the club's quizzes, with your result on each
 *   GET  /api/quiz?club=gray-fox&quiz=baldwin             → that quiz, your progress and the club's table
 *   POST /api/quiz { action, club, quiz, … }              → start or answer it
 */

const SLUG = /^[a-z0-9-]{3,40}$/;
const QUIZ = /^[a-z0-9-]{2,60}$/;

async function who(request: Request) {
  const db = supabaseAdmin();
  if (!db) return { error: Response.json({ error: "Not set up" }, { status: 500 }) } as const;
  const userId = await callerIdQuick(db, request);
  if (!userId) return { error: Response.json({ error: "Sign in first" }, { status: 401 }) } as const;
  return { db, userId } as const;
}

const noStore = { headers: { "Cache-Control": "no-store" } };

/** How long the request took, visible in the browser's network panel (Server-Timing), to spot slowness. */
function timed(res: Response, since: number): Response {
  res.headers.set("Server-Timing", `total;dur=${Date.now() - since}`);
  return res;
}

export async function GET(request: Request) {
  const since = Date.now();
  return timed(await get(request), since);
}

async function get(request: Request): Promise<Response> {
  const w = await who(request);
  if ("error" in w) return w.error as Response;
  const url = new URL(request.url);
  const club = url.searchParams.get("club");
  const quiz = url.searchParams.get("quiz");
  if (club) {
    if (!SLUG.test(club)) return Response.json({ error: "No such club." }, { status: 404 });
    if (!quiz) {
      const list = await clubQuizList(w.db, w.userId, club);
      return list ? Response.json(list, noStore) : Response.json({ error: "Only for the club's members." }, { status: 403 });
    }
    if (!QUIZ.test(quiz)) return Response.json({ error: "No such quiz." }, { status: 404 });
    const state = await clubQuizState(w.db, w.userId, club, quiz);
    return "error" in state && !("quiz" in state) ? Response.json(state, { status: 403 }) : Response.json(state, noStore);
  }
  return Response.json(await quizState(w.db, w.userId), noStore);
}

export async function POST(request: Request) {
  const since = Date.now();
  return timed(await post(request), since);
}

async function post(request: Request): Promise<Response> {
  const w = await who(request);
  if ("error" in w) return w.error as Response;
  const body = (await request.json().catch(() => ({}))) as { action?: string; index?: number; choice?: number | null; club?: string; quiz?: string };
  const forClub = body.club != null;
  if (forClub && !(SLUG.test(body.club ?? "") && QUIZ.test(body.quiz ?? ""))) {
    return Response.json({ error: "No such quiz." }, { status: 404 });
  }

  if (body.action === "start") {
    const state = forClub ? await startClubQuiz(w.db, w.userId, body.club!, body.quiz!) : await startQuiz(w.db, w.userId);
    return "error" in state && !("quiz" in state) ? Response.json(state, { status: 403 }) : Response.json(state);
  }
  if (body.action === "answer" && Number.isInteger(body.index)) {
    const choice = body.choice == null ? null : Number(body.choice);
    if (choice != null && !(Number.isInteger(choice) && choice >= 0 && choice <= 3)) {
      return Response.json({ error: "Pick one of the four answers." }, { status: 400 });
    }
    const result = forClub
      ? await answerClubQuiz(w.db, w.userId, body.club!, body.quiz!, body.index!, choice)
      : await answerQuiz(w.db, w.userId, body.index!, choice);
    if ("error" in result && !("state" in result)) return Response.json(result, { status: 403 });
    return Response.json(result, { status: "error" in result ? 409 : 200 });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
