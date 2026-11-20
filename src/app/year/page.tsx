import type { Metadata } from "next";
import { Suspense } from "react";
import { YearScreen } from "@/components/year";

export const metadata: Metadata = { title: "Your year in the room" };

export default function YearPage() {
  return (
    <Suspense fallback={null}>
      <YearScreen />
    </Suspense>
  );
}
