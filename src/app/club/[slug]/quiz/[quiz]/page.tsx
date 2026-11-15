import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizScreen } from "@/components/quiz";

export const metadata: Metadata = { title: "Club quiz" };

export default function ClubQuizPage({ params }: PageProps<"/club/[slug]/quiz/[quiz]">) {
  return (
    <Suspense fallback={<p className="loading">Shuffling the questions…</p>}>
      {params.then(({ slug, quiz }) => <QuizScreen quizRef={{ club: slug.toLowerCase(), quiz: quiz.toLowerCase() }} />)}
    </Suspense>
  );
}
