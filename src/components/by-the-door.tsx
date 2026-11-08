"use client";

import { useState } from "react";
import { answerRecommendation, type Recommendation } from "@/lib/wall";

/* eslint-disable @next/next/no-img-element -- remote cover art */

const KIND_WORD = { song: "a song", poster: "a film", scene: "a scene", book: "a book" } as const;

/** In your own room: what friends left at your door. Hang it, or pass. */
export function ByTheDoor({ recs, meId, onChanged }: { recs: Recommendation[]; meId: string; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (!recs.length) return null;

  async function answer(rec: Recommendation, keep: boolean) {
    setBusy(rec.id);
    const err = await answerRecommendation(rec, keep, meId);
    setBusy(null);
    if (err) return setMsg(err);
    onChanged();
  }

  return (
    <section className="by-door" aria-label="Left at your door">
      <h2>Left at your door</h2>
      <ul>
        {recs.map((r) => (
          <li key={r.id} className="rec">
            {r.cover_url ? <img src={r.cover_url} alt="" className={r.type === "song" ? "sq" : ""} /> : <span className="rec-blank" aria-hidden="true" />}
            <div className="rec-body">
              <p className="rec-who"><b>@{r.username}</b> left you {KIND_WORD[r.type]}</p>
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
