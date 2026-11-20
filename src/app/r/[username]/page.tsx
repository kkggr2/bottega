import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomRoute, RoomSkeleton } from "@/components/room";

// The link preview's words; the picture comes from opengraph-image.tsx next to this file.
export async function generateMetadata({ params }: PageProps<"/r/[username]">): Promise<Metadata> {
  const username = decodeURIComponent((await params).username).toLowerCase();
  const title = `@${username}'s room`;
  const description = `Step into @${username}'s room on Bottega: the films, books and records they love.`;
  return { title, description, openGraph: { title: `${title} · Bottega`, description, url: `/r/${username}`, siteName: "Bottega" }, twitter: { card: "summary_large_image", title: `${title} · Bottega`, description } };
}

// The room reads its name from the address on the phone, so a room you've been in opens at once.
export default function RoomPage() {
  return (
    <Suspense fallback={<RoomSkeleton />}>
      <RoomRoute />
    </Suspense>
  );
}
