import { Suspense } from "react";
import { ClubScreen } from "@/components/club";

export default function ClubPage({ params }: PageProps<"/club/[slug]">) {
  return (
    <Suspense fallback={<p className="loading">Opening the club…</p>}>
      {params.then(({ slug }) => <ClubScreen slug={slug.toLowerCase()} />)}
    </Suspense>
  );
}
