import { Suspense } from "react";
import { RoomRoute } from "@/components/room";

// The room reads its name from the address on the phone, so a room you've been in opens at once.
export default function RoomPage() {
  return (
    <Suspense fallback={<p className="loading">Turning on the lights…</p>}>
      <RoomRoute />
    </Suspense>
  );
}
