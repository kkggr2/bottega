import type { Metadata } from "next";
import { Suspense } from "react";
import { RateSlide } from "@/components/film-night";

export const metadata: Metadata = { title: "Rate tonight's film", robots: { index: false, follow: false } };

/* The slide for the projector (or to print for the desk): the club's QR code, big. */
export default function RateSlidePage({ params }: PageProps<"/rate/[slug]/screen">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => <RateSlide slug={slug.toLowerCase()} />)}
    </Suspense>
  );
}
