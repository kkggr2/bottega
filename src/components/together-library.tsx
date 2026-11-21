"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { useT } from "@/lib/i18n";
import { THEMES } from "@/lib/themes";
import { answerTogether, myTogether, type TogetherSummary } from "@/lib/together";
import { track } from "@/lib/track";

/** Shared rooms in the Library, fetched once per visit. */
function useTogether(): [TogetherSummary[] | null, () => void] {
  const [list, setList] = useState<TogetherSummary[] | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { myTogether().then(setList).catch(() => setList([])); }, [tick]);
  return [list, () => setTick((n) => n + 1)];
}

/** "@ben asked you to share a room": move in, or not. */
export function TogetherInvites() {
  const t = useT();
  const router = useRouter();
  const [list, reload] = useTogether();
  const [busy, setBusy] = useState<string | null>(null);
  const invites = (list ?? []).filter((r) => r.status === "invited");
  if (!invites.length) return null;
  async function answer(r: TogetherSummary, yes: boolean) {
    setBusy(r.room_id);
    const err = await answerTogether(r.room_id, yes);
    setBusy(null);
    if (err) return;
    track("friend_request", { detail: yes ? "together:yes" : "together:no" });
    if (yes) router.push(`/together/${r.room_id}`); else reload();
  }
  return (
    <section className="requests" aria-label={t("Rooms for two")}>
      {invites.map((r) => (
        <div className="request" key={r.room_id}>
          <span>{t("@{name} asked you to share a room: “{room}”", { name: r.partner ?? "someone", room: r.name })}</span>
          <span className="row">
            <button className="btn small" type="button" disabled={busy === r.room_id} onClick={() => answer(r, true)}>{t("Move in")}</button>
            <button className="btn ghost small" type="button" disabled={busy === r.room_id} onClick={() => answer(r, false)}>{t("No, thanks")}</button>
          </span>
        </div>
      ))}
    </section>
  );
}

/** Double doors in the hallway, one pair per room you share. */
export function TogetherDoors() {
  const t = useT();
  const [list] = useTogether();
  const rooms = (list ?? []).filter((r) => r.status === "joined");
  return (
    <>
      {rooms.map((r) => {
        const th = THEMES[r.theme] ?? THEMES.oak;
        return (
          <div role="listitem" key={r.room_id} className="hall-door duo">
            <Link href={`/together/${r.room_id}`} className="door-link" aria-label={`${r.name}, ${t("a room for two")}`}
              style={{ "--dr-paint": th.wall, "--dr-ink": th.ink, "--dr-accent": th.accent, "--dr-floor": th.floor } as CSSProperties}>
              <span className="lamp" aria-hidden="true" />
              <span className="doorway" aria-hidden="true">
                <span className="inside" />
                <span className="leaf left"><span className="dpanel top" /><span className="dpanel bottom" /><span className="knob" /></span>
                <span className="leaf right"><span className="dpanel top" /><span className="dpanel bottom" /><span className="knob" /></span>
                <span className="plate">{t("You & {name}", { name: r.partner ?? "…" })}</span>
              </span>
              <span className="step" aria-hidden="true" />
            </Link>
            <p className="door-name">{r.name}</p>
            <p className="door-now">{r.partner_status === "invited" ? t("Waiting for @{name}", { name: r.partner ?? "" }) : t("a room for two")}</p>
          </div>
        );
      })}
    </>
  );
}
