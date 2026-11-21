import type { Metadata } from "next";
import { Suspense } from "react";
import { TogetherRoute } from "@/components/together-room";

export const metadata: Metadata = { title: "A room for two", robots: { index: false } };

// A room two friends share. Only they and their friends can come in.
export default function TogetherPage() {
  return (
    <Suspense fallback={<p className="loading">One moment…</p>}>
      <TogetherRoute />
    </Suspense>
  );
}
