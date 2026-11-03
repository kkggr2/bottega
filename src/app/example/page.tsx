import type { Metadata } from "next";
import { ExampleRoom } from "@/components/example-room";

export const metadata: Metadata = { title: "Example room" };

export default function ExamplePage() {
  return <ExampleRoom />;
}
