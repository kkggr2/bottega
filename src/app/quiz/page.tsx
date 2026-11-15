import type { Metadata } from "next";
import { QuizRoomScreen } from "@/components/quiz";

export const metadata: Metadata = { title: "The Quiz room" };

export default function QuizRoomPage() {
  return <QuizRoomScreen />;
}
