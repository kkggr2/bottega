import { Suspense } from "react";
import { JoinScreen } from "@/components/club";

export default function JoinPage({ params }: PageProps<"/join/[slug]">) {
  return (
    <Suspense fallback={<p className="loading">Finding the club…</p>}>
      {params.then(({ slug }) => <JoinScreen slug={slug.toLowerCase()} />)}
    </Suspense>
  );
}
