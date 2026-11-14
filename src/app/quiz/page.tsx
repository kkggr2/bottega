import type { Metadata } from "next";
import { QuizScreen } from "@/components/quiz";

export const metadata: Metadata = { title: "Today's quiz" };

export default function QuizPage() {
  return <QuizScreen />;
}
