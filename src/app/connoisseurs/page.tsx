import type { Metadata } from "next";
import { ConnoisseursIndex } from "@/components/connoisseurs";

export const metadata: Metadata = { title: "Founding Connoisseurs", description: "Bottega's first Connoisseurs, invited for their taste. Step into their rooms." };

export default function ConnoisseursPage() {
  return <ConnoisseursIndex />;
}
