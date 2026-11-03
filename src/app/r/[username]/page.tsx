import { Suspense } from "react";
import { RoomScreen } from "@/components/room";

export default function RoomPage({ params }: PageProps<"/r/[username]">) {
  return (
    <Suspense fallback={<p className="loading">Turning on the lights…</p>}>
      {params.then(({ username }) => <RoomScreen username={username} />)}
    </Suspense>
  );
}
