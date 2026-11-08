"use client";

import { useState } from "react";
import { searchBooks, searchFilms, searchSongs, type Found } from "@/lib/lookup";
import { recommend } from "@/lib/wall";
import { SearchPicker } from "./search-picker";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- remote cover art */

type Kind = "song" | "poster" | "book";
const KINDS: { kind: Kind; label: string; search: typeof searchSongs; source: string; placeholder: string }[] = [
  { kind: "song", label: "Song", search: searchSongs, source: "Apple Music", placeholder: "Song or artist" },
  { kind: "poster", label: "Film", search: searchFilms, source: "TMDB", placeholder: "Film or show" },
  { kind: "book", label: "Book", search: searchBooks, source: "Open Library", placeholder: "Title or author" },
];

/** Leave a song, film or book at a friend's door, with a note. */
export function RecommendSheet({ meId, toId, toName, onClose }: { meId: string; toId: string; toName: string; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>("song");
  const [picked, setPicked] = useState<Found | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const meta = KINDS.find((k) => k.kind === kind)!;

  async function send() {
    if (!picked) return setMsg("Pick something first.");
    setBusy(true);
    const err = await recommend({
      to_user: toId, from_user: meId, type: kind, title: picked.title.slice(0, 80), subtitle: picked.subtitle.slice(0, 80),
      cover_url: picked.cover_url, preview_url: kind === "song" ? picked.preview_url ?? null : null,
      link: picked.link ?? null, note: note.trim().slice(0, 280),
    });
    setBusy(false);
    if (err) return setMsg(err);
    setSent(true);
  }

  if (sent) {
    return (
      <Sheet onClose={onClose} label="Recommendation sent">
        <h2>Left at @{toName}&rsquo;s door.</h2>
        <p>They&rsquo;ll find {picked?.title} waiting, with your note. If they hang it, it moves into their room.</p>
        <div className="row"><button className="btn" type="button" onClick={onClose}>Done</button></div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} label={`Recommend something to @${toName}`}>
      <h2>Recommend something to @{toName}</h2>
      <div className="chips" role="group" aria-label="What kind">
        {KINDS.map((k) => (
          <button key={k.kind} type="button" className="chip" aria-pressed={kind === k.kind}
            onClick={() => { setKind(k.kind); setPicked(null); setMsg(null); }}>{k.label}</button>
        ))}
      </div>
      {picked ? (
        <div className="picked">
          {picked.cover_url && <img src={picked.cover_url} alt="" />}
          <div>
            <b>{picked.title}</b>
            <span className="muted">{picked.subtitle}</span>
            <button className="linkish" type="button" onClick={() => setPicked(null)}>Pick something else</button>
          </div>
        </div>
      ) : (
        <SearchPicker key={kind} id="rec-search" label={`Find a ${meta.label.toLowerCase()}`} placeholder={meta.placeholder}
          source={meta.source} search={meta.search} onPick={(f) => { setPicked(f); setMsg(null); }} />
      )}
      <div className="field why">
        <label htmlFor="rec-note">Why them?</label>
        <textarea id="rec-note" rows={2} maxLength={280} value={note} placeholder="This made me think of you…"
          onChange={(e) => setNote(e.target.value)} />
      </div>
      <p className="msg err" aria-live="polite">{msg}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="button" disabled={busy || !picked} onClick={send}>{busy ? "Leaving it…" : "Leave it at their door"}</button>
      </div>
    </Sheet>
  );
}
