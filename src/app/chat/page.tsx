import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatScreen } from "@/components/chat";

export const metadata: Metadata = { title: "Tonight's room" };

export default function ChatPage() {
  return <Suspense fallback={<p className="loading">Opening the door…</p>}><ChatScreen /></Suspense>;
}
