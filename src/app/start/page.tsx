import type { Metadata } from "next";
import { StartClubScreen } from "@/components/start-club";

export const metadata: Metadata = {
  title: "Start your club",
  description: "A home for your film club, book club or group of friends: your shelf, what's next, a club chat and your own quiz.",
};

export default function StartPage() {
  return <StartClubScreen />;
}
