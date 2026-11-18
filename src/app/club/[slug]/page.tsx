import { Suspense } from "react";
import { ClubRoute } from "@/components/club";

export default function ClubPage() {
  return (
    <Suspense fallback={<p className="loading">Opening the club…</p>}>
      <ClubRoute />
    </Suspense>
  );
}
