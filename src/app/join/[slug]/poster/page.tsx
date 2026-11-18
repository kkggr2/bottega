import type { Metadata } from "next";
import { Suspense } from "react";
import { ClubPoster } from "@/components/club-poster";

export const metadata: Metadata = { title: "Club poster", robots: { index: false } };

// A printable A4 poster with the club's QR code, for the wall or the screen at a meeting.
export default function PosterPage() {
  return (
    <Suspense fallback={null}>
      <ClubPoster />
    </Suspense>
  );
}
