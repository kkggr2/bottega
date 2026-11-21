"use client";

import { useState } from "react";
import { answerRecommendation, openGift, type Recommendation } from "@/lib/wall";

/* eslint-disable @next/next/no-img-element -- remote cover art */

const KIND_WORD = { song: "a song", poster: "a film", scene: "a scene", book: "a book" } as const;

/** In your own room: what friends left at your door. Wrapped ones wait as parcels until you open them. */
export function ByTheDoor({ recs, meId, onChanged }: { recs: Recommendation[]; meId: string; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // Opened here just now: shown unwrapped at once, and the paper flies off for a moment.
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [opening, setOpening] = useState<string | null>(null);
  if (!recs.length) return null;

  async function answer(rec: Recommendation, keep: boolean) {
    setBusy(rec.id);
    const err = await answerRecommendation(rec, keep, meId);
    setBusy(null);
    if (err) return setMsg(err);
    onChanged();
  }

  async function unwrap(rec: Recommendation) {
    setOpening(rec.id);
    navigator.vibrate?.(12);
    const err = await openGift(rec);
    if (err) { setOpening(null); return setMsg(err); }
    setTimeout(() => { setOpened((s) => new Set(s).add(rec.id)); setOpening(null); }, 650);
  }

  const wrappedNow = (r: Recommendation) => Boolean(r.wrapped && !r.opened_at && !opened.has(r.id));

  return (
    <section className="by-door" aria-label="Left at your door">
      <h2>Left at your door</h2>
      <ul>
        {recs.map((r) => wrappedNow(r) ? (
          <li key={r.id} className="rec gift">
            <button type="button" className={`parcel${opening === r.id ? " opening" : ""}`} onClick={() => unwrap(r)}
              disabled={opening === r.id} aria-label={`Unwrap the gift from @${r.username}`}>
              <span className="parcel-lid" aria-hidden="true" />
              <span className="parcel-box" aria-hidden="true" />
              <span className="parcel-bow" aria-hidden="true" />
            </button>
            <div className="rec-body">
              <p className="rec-who"><b>@{r.username}</b> left you something wrapped</p>
              {r.note && <p className="rec-note">“{r.note}”</p>}
              <div className="row">
                <button className="btn small" type="button" disabled={opening === r.id} onClick={() => unwrap(r)}>
                  {opening === r.id ? "Unwrapping…" : "Unwrap it"}
                </button>
              </div>
            </div>
          </li>
        ) : (
          <li key={r.id} className={`rec${opened.has(r.id) ? " just-opened" : ""}`}>
            {r.cover_url ? <img src={r.cover_url} alt="" className={r.type === "song" ? "sq" : ""} /> : <span className="rec-blank" aria-hidden="true" />}
            <div className="rec-body">
              <p className="rec-who"><b>@{r.username}</b> {r.wrapped ? "wrapped up" : "left you"} {KIND_WORD[r.type]}</p>
              <p className="rec-title">{r.title}<span className="muted"> · {r.subtitle}</span></p>
              {r.note && <p className="rec-note">“{r.note}”</p>}
              <div className="row">
                <button className="btn small" type="button" disabled={busy === r.id} onClick={() => answer(r, true)}>Hang it in my room</button>
                <button className="btn ghost small" type="button" disabled={busy === r.id} onClick={() => answer(r, false)}>Not for me</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="msg err" aria-live="polite">{msg}</p>
    </section>
  );
}
