import type { Metadata } from "next";
import { Suspense } from "react";
import { MessagesScreen } from "@/components/messages";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return <Suspense fallback={<p className="loading">Opening your post…</p>}><MessagesScreen /></Suspense>;
}
