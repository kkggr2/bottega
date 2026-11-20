import { BANK } from "@/lib/quiz/bank";

/** GET /api/quiz-title?id=nolan → { title }. Titles only, never the questions or answers. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const quiz = BANK.find((q) => q.id === id);
  return Response.json({ title: quiz?.title ?? null }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
