import type { Metadata } from "next";
import { NumbersRoute } from "@/components/numbers";

export const metadata: Metadata = { title: "Numbers", robots: { index: false, follow: false } };

// Growth numbers per invite link. Only for Bottega's team (public.admins).
export default function NumbersPage() {
  return <NumbersRoute />;
}
