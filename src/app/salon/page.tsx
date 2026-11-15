import type { Metadata } from "next";
import { SalonScreen } from "@/components/salon";

export const metadata: Metadata = { title: "The Salon" };

export default function SalonPage() {
  return <SalonScreen />;
}
