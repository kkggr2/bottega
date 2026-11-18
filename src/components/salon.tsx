"use client";

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
  usePalette(SALON, "salon");
  return (
    <div className="place">
      <header className="place-head">
        <p className="smallcaps muted">The Salon</p>
        <h1>Who&rsquo;s talking tonight</h1>
        <p className="lede">Rooms open for whatever you have on, your clubs, and your letters.</p>
      </header>
      <TonightRooms />
      <ClubsSection />
      <Letters />
    </div>
  );
}

/** The latest private messages, with a way to all of them. */
function Letters() {
  const { userId } = useAuth();
  const [threads, setThreads] = useRemembered<Thread[] | null>(userId ? `letters:${userId}` : null, null);
  useEffect(() => { myThreads().then(setThreads).catch(() => setThreads([])); }, [setThreads]);
  if (!threads) return null;
  const unread = threads.reduce((n, t) => n + t.unread, 0);
  return (
    <section className="tonight" aria-label="Messages">
      <div className="tonight-head">
        <h2>Letters{unread ? <span className="badge">{unread}</span> : null}</h2>
        <Link href="/messages" className="btn ghost small">All messages</Link>
      </div>
      {threads.length === 0 ? (
        <p className="muted">Nothing yet. Tap someone&rsquo;s message in tonight&rsquo;s rooms to write to them privately.</p>
      ) : (
        <ul className="threads">
          {threads.slice(0, 4).map((t) => (
            <li key={t.other_id}>
              <Link href={`/messages?with=${encodeURIComponent(t.username)}`} className={t.unread ? "unread" : ""}>
                <b>@{t.username}{t.is_request ? <span className="smallcaps muted"> · request</span> : null}</b>
                <span className="muted">{t.last_from_me ? "You: " : ""}{t.last_body}</span>
                <span className="when muted">{ago(t.last_at)}{t.unread ? <span className="badge">{t.unread}</span> : null}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
