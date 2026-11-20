import type { Metadata } from "next";
import { FamousIndex } from "@/components/famous-index";

export const metadata: Metadata = { title: "Famous rooms", description: "Step into the rooms of people whose taste shaped yours, and see how alike you are." };

export default function FamousIndexPage() {
  return <FamousIndex />;
}
