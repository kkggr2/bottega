import type { Metadata } from "next";
import { Suspense } from "react";
import { RateScreen } from "@/components/film-night";

export const metadata: Metadata = { title: "Rate tonight's film", robots: { index: false, follow: false } };

/* bottegarooms.com/rate/<club>: the club's QR code on film night opens this. */
export default function RatePage({ params }: PageProps<"/rate/[slug]">) {
  return (
    <Suspense fallback={<p className="loading">Opening tonight&rsquo;s film…</p>}>
      {params.then(({ slug }) => <RateScreen slug={slug.toLowerCase()} />)}
    </Suspense>
  );
}
