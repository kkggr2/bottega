"use client";

import { useT } from "@/lib/i18n";
import Link from "next/link";
import { useEffect } from "react";
import { ago, myThreads, type Thread } from "@/lib/chat";
import { SALON, usePalette } from "@/lib/room-colors";
import { TonightRooms } from "./chat";
import { ClubsSection } from "./club";
import { Gate } from "./gate";
import { useAuth } from "./auth";
import { useRemembered } from "@/lib/remember";

/*
 * The Salon: the lamp-lit room where people talk. Tonight's rooms (chats by the artist, director
 * or author you have on), your clubs, and your private messages, each in its own part of the room.
 */

export function SalonScreen() {
  return <Gate>{() => <SalonView />}</Gate>;
}

export function SalonView() {
  const t = useT();
  usePalette(SALON, "salon");
  return (
    <div className="place">
      <header className="place-head">
        <p className="smallcaps muted">{t("The Salon")}</p>
        <h1>{t("Who's talking tonight")}</h1>
        <p className="lede">{t("Rooms open for whatever you have on, your clubs, and your letters.")}</p>
      </header>
      <TonightRooms />
      <ClubsSection />
      <Letters />
    </div>
  );
}

/** The latest private messages, with a way to all of them. */
function Letters() {
  const t = useT();
  const { userId } = useAuth();
  const [threads, setThreads] = useRemembered<Thread[] | null>(userId ? `letters:${userId}` : null, null);
  useEffect(() => { myThreads().then(setThreads).catch(() => setThreads([])); }, [setThreads]);
  if (!threads) return null;
  const unread = threads.reduce((n, th) => n + th.unread, 0);
  return (
    <section className="tonight" aria-label={t("Messages")}>
      <div className="tonight-head">
        <h2>{t("Letters")}{unread ? <span className="badge">{unread}</span> : null}</h2>
        <Link href="/messages" className="btn ghost small">{t("All messages")}</Link>
      </div>
      {threads.length === 0 ? (
        <p className="muted">{t("Nothing yet. Tap someone's message in tonight's rooms to write to them privately.")}</p>
      ) : (
        <ul className="threads">
          {threads.slice(0, 4).map((th) => (
            <li key={th.other_id}>
              <Link href={`/messages?with=${encodeURIComponent(th.username)}`} className={th.unread ? "unread" : ""}>
                <b>@{th.username}{th.is_request ? <span className="smallcaps muted"> · {t("request")}</span> : null}</b>
                <span className="muted">{th.last_from_me ? `${t("You")}: ` : ""}{th.last_body}</span>
                <span className="when muted">{ago(th.last_at)}{th.unread ? <span className="badge">{th.unread}</span> : null}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
