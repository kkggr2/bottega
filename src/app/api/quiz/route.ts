import { answerQuiz, quizState, startQuiz } from "@/lib/quiz/server";
import { callerId } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * The daily quiz.
 * GET  /api/quiz                                → today's quiz, your progress and the high score table
 * POST /api/quiz { action: "start" }            → start (or pick up) today's quiz
 * POST /api/quiz { action: "answer", index, choice } → answer the current question (choice null = time ran out)
 */

async function who(request: Request) {
  const db = supabaseAdmin();
  if (!db) return { error: Response.json({ error: "Not set up" }, { status: 500 }) } as const;
  const userId = await callerId(db, request);
  if (!userId) return { error: Response.json({ error: "Sign in first" }, { status: 401 }) } as const;
  return { db, userId } as const;
}

export async function GET(request: Request) {
  const w = await who(request);
  if ("error" in w) return w.error;
  return Response.json(await quizState(w.db, w.userId), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const w = await who(request);
  if ("error" in w) return w.error;
  const body = (await request.json().catch(() => ({}))) as { action?: string; index?: number; choice?: number | null };
  if (body.action === "start") return Response.json(await startQuiz(w.db, w.userId));
  if (body.action === "answer" && Number.isInteger(body.index)) {
    const choice = body.choice == null ? null : Number(body.choice);
    if (choice != null && !(Number.isInteger(choice) && choice >= 0 && choice <= 3)) {
      return Response.json({ error: "Pick one of the four answers." }, { status: 400 });
    }
    const result = await answerQuiz(w.db, w.userId, body.index!, choice);
    return Response.json(result, { status: "error" in result ? 409 : 200 });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
