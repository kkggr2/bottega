"use client";

import { useEffect, useRef, useState } from "react";
import { readGoodreadsExport } from "@/lib/goodreads";
import { friendlyError, supabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import { MAX_PIECES } from "@/lib/themes";
import type { Piece, PieceType } from "@/lib/types";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- remote cover thumbnails */

type Candidate = {
  key: string;
  title: string;
  subtitle: string;
  cover_url: string | null;
  link: string | null;
  note: string;
  suggested: boolean;
};

type Source = "letterboxd" | "goodreads";
/** Where a film goes: framed on the wall, in the DVD pile (ready to play on the TV), or left out. */
type Place = "poster" | "scene" | "skip";

const stars = (rating: number | null) => (rating ? "★".repeat(Math.floor(rating)) + (rating % 1 ? "½" : "") : "");

export function ImportSheet({ ownerId, pieces, wallSpace = 12, onClose, onImported }: {
  ownerId: string; pieces: Piece[]; onClose: () => void;
  /** How many more posters the wall can take (it holds WALL_MAX). */
  wallSpace?: number;
  /** After something came in: how many, and whether they were films or books (so the room can say how to undo it). */
  onImported?: (count: number, kind: "films" | "books") => void;
}) {
  const [source, setSource] = useState<Source>("letterboxd");
  const [username, setUsername] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [round, setRound] = useState(0);

  const room = MAX_PIECES - pieces.length;
  const type: PieceType = "book";
  const alreadyIn = new Set(pieces.map((p) => `${p.type}:${p.title.toLowerCase()}`));
  const isIn = (c: Candidate) => alreadyIn.has(`${type}:${c.title.toLowerCase()}`);
  // A film already in the room, framed or in the DVD pile, isn't offered again.
  const filmIn = (c: Candidate) => ["poster", "scene"].some((t) => alreadyIn.has(`${t}:${c.title.toLowerCase()}`));

  function show(list: Candidate[], cap: number) {
    setCandidates(list);
    const picks = list.filter((c) => c.suggested && !alreadyIn.has(`${type}:${c.title.toLowerCase()}`)).slice(0, Math.min(cap, room));
    setChosen(new Set(picks.map((c) => c.key)));
  }

  function switchTo(next: Source) {
    setSource(next);
    setCandidates(null);
    setChosen(new Set());
    setMsg(null);
  }

  async function findFilms() {
    const user = username.trim().replace(/^@/, "");
    if (!user) return setMsg({ kind: "err", text: "Type your Letterboxd username." });
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/import/letterboxd?user=${encodeURIComponent(user)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't read that Letterboxd profile.");
      const films = data.films as { id: string; title: string; subtitle: string; cover_url: string | null; rating: number | null; liked: boolean; link: string }[];
      const list: Candidate[] = films.map((f) => ({
        key: f.id, title: f.title, subtitle: f.subtitle, cover_url: f.cover_url, link: f.link,
        note: [stars(f.rating), f.liked ? "♥" : ""].filter(Boolean).join(" "),
        suggested: f.liked || (f.rating ?? 0) >= 4,
      }));
      // One at a time, your likes and 4-star films first; films already in the room aren't asked about again.
      const fresh = list.filter((c) => !filmIn(c));
      setCandidates([...fresh.filter((c) => c.suggested), ...fresh.filter((c) => !c.suggested)]);
      setRound((r) => r + 1); // a new search starts the sorting over
      setMsg(fresh.length
        ? { kind: "ok", text: `Found ${films.length} films from ${user}'s diary. Your likes and 4-star films come first.` }
        : { kind: "err", text: "Every film in that diary is already in your room." });
    } catch (error) {
      setMsg({ kind: "err", text: error instanceof Error ? error.message : "Couldn't read that profile." });
    }
    setBusy(false);
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    try {
      const books = readGoodreadsExport(await file.text());
      // Read books first, best-loved first.
      books.sort((a, b) => Number(b.shelf === "read") - Number(a.shelf === "read") || Number(b.favorite) - Number(a.favorite) || b.rating - a.rating);
      show(
        books.map((b) => ({
          key: b.id, title: b.title, subtitle: b.subtitle, cover_url: b.cover_url, link: b.link || null,
          note: [stars(b.rating), b.favorite ? "favorite" : "", b.shelf !== "read" ? b.shelf : ""].filter(Boolean).join(" · "),
          suggested: b.shelf === "read" && (b.favorite || b.rating >= 4),
        })),
        20,
      );
      setMsg({ kind: "ok", text: `Read ${books.length} books. Your favorites and 4-star-plus reads are picked.` });
    } catch {
      setMsg({ kind: "err", text: "That file isn't a Goodreads export. On Goodreads use My Books → Import and export → Export library." });
    }
  }

  function toggle(key: string) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < room) next.add(key);
      return next;
    });
  }

  /** Each pick goes where it was put: books on the shelf; films on the wall or in the DVD pile. */
  async function put(picks: { c: Candidate; type: PieceType }[]) {
    if (!picks.length) return setMsg({ kind: "err", text: "Pick at least one." });
    setBusy(true);
    const base = Date.now() / 1000;
    const rows = picks.map(({ c, type: t }, i) => ({
      owner_id: ownerId,
      type: t,
      title: c.title.slice(0, 80),
      subtitle: c.subtitle.slice(0, 80),
      body: "",
      cover_url: c.cover_url,
      link: c.link,
      position: base + i / 1000,
    }));
    const { error } = await supabase().from("pieces").insert(rows);
    setBusy(false);
    if (error) return setMsg({ kind: "err", text: friendlyError(error, "Couldn't add them.") });
    track("import", { room: ownerId, detail: `${source}:${rows.length}` });
    onImported?.(rows.length, source === "goodreads" ? "books" : "films");
    onClose();
  }

  const save = () => put((candidates ?? []).filter((c) => chosen.has(c.key) && !isIn(c)).map((c) => ({ c, type })));
  const sorting = source === "letterboxd" && candidates !== null && candidates.length > 0;

  return (
    <Sheet onClose={onClose} onSubmit={source === "goodreads" ? (candidates ? save : undefined) : candidates ? undefined : findFilms} label="Bring in your favorites">
      <h2>Bring in your favorites</h2>
      <div className="chips" role="group" aria-label="Import from">
        <button type="button" className="chip" aria-pressed={source === "letterboxd"} onClick={() => switchTo("letterboxd")}>Films from Letterboxd</button>
        <button type="button" className="chip" aria-pressed={source === "goodreads"} onClick={() => switchTo("goodreads")}>Books from Goodreads</button>
      </div>

      {source === "letterboxd" ? (
        <div className="field">
          <label htmlFor="lb-user">Your Letterboxd username</label>
          <div className="addfriend" style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input id="lb-user" type="text" enterKeyHint="search" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} placeholder="e.g. davidehrlich" value={username}
                onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); findFilms(); } }} />
              <button className="btn" type="button" disabled={busy} onClick={findFilms}>{busy && !candidates ? "Looking…" : "Find my films"}</button>
            </div>
          </div>
          <span className="hint">Reads your public diary (your most recent 40 films). Nothing is posted to Letterboxd.</span>
        </div>
      ) : (
        <div className="field">
          <label htmlFor="gr-file">Your Goodreads export</label>
          <input id="gr-file" type="file" accept=".csv,text/csv" onChange={(e) => readFile(e.target.files?.[0])} />
          <span className="hint">
            On Goodreads: <b>My Books → Import and export → Export library</b>, then download the file and choose it here. It stays on your device; only the books you pick are saved.
          </span>
        </div>
      )}

      <p className={`msg ${msg?.kind ?? ""}`} aria-live="polite">{msg?.text}</p>

      {sorting && <FilmSorter key={round} films={candidates} room={room} wallSpace={wallSpace} busy={busy} onPut={(picks) => void put(picks)} onCancel={onClose} />}

      {source === "goodreads" && candidates && (
        <ul className="pick-list" aria-label="Choose what to bring in">
          {candidates.map((c) => {
            const inRoom = isIn(c);
            return (
              <li key={c.key}>
                <label className={inRoom ? "in-room" : undefined}>
                  <input type="checkbox" checked={inRoom || chosen.has(c.key)} disabled={inRoom} onChange={() => toggle(c.key)} />
                  {c.cover_url ? <img src={c.cover_url} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /> : <span className="noart" aria-hidden="true" />}
                  <span>
                    <b>{c.title}</b>
                    <span className="muted">{[c.subtitle, inRoom ? "already in your room" : c.note].filter(Boolean).join(" · ")}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {!sorting && (
        <div className="row split">
          <span className="hint">{room > 0 ? `${room} spaces left in your room` : "Your room is full. Remove something first."}</span>
          <div className="row">
            <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
            {source === "goodreads" && candidates && (
              <button className="btn" type="submit" disabled={busy || chosen.size === 0}>
                {busy ? "Bringing in…" : `Put ${chosen.size} on your bookshelf`}
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

/**
 * Letterboxd films, one at a time: swipe right (or tap) to hang it on the wall, left for the DVD pile, or skip it.
 * Nothing is saved until the end: Undo steps back, and the last screen lets you move any film or leave it out.
 */
function FilmSorter({ films, room, wallSpace, busy, onPut, onCancel }: {
  films: Candidate[]; room: number; wallSpace: number; busy: boolean;
  onPut: (picks: { c: Candidate; type: PieceType }[]) => void; onCancel: () => void;
}) {
  const [place, setPlace] = useState<Record<string, Place>>({});
  const [history, setHistory] = useState<string[]>([]);
  const [at, setAt] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<"left" | "right" | "down" | null>(null);
  const start = useRef<number | null>(null);

  const placed = (p: Record<string, Place>) => Object.values(p).filter((v) => v !== "skip").length;
  const onWall = Object.values(place).filter((v) => v === "poster").length;
  const inPile = Object.values(place).filter((v) => v === "scene").length;
  const film = films[at];
  const full = placed(place) >= room;
  // The wall holds WALL_MAX: once its spaces are used, the rest can go in the DVD pile.
  const wallLeft = wallSpace - onWall;

  function decide(where: Place) {
    if (!film || leaving) return;
    if (where === "poster" && wallLeft <= 0) { setDx(0); return; }
    setLeaving(where === "poster" ? "right" : where === "scene" ? "left" : "down");
    setDx(0);
    // A short glide out, then the next film (or the summary when the list or the room runs out).
    window.setTimeout(() => {
      const next = { ...place, [film.key]: where };
      setPlace(next);
      setHistory((h) => [...h, film.key]);
      setLeaving(null);
      if (at + 1 >= films.length || placed(next) >= room) setReviewing(true);
      else setAt(at + 1);
    }, 170);
  }

  function undo() {
    const key = history.at(-1);
    if (!key) return;
    setHistory((h) => h.slice(0, -1));
    setPlace((p) => { const n = { ...p }; delete n[key]; return n; });
    setAt(films.findIndex((f) => f.key === key));
    setReviewing(false);
  }

  // Arrow keys on a computer: right for the wall, left for the DVD pile, down to skip.
  useEffect(() => {
    if (reviewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") decide("poster");
      else if (e.key === "ArrowLeft") decide("scene");
      else if (e.key === "ArrowDown") decide("skip");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (reviewing || !film) {
    const picks = films.filter((f) => place[f.key] === "poster" || place[f.key] === "scene");
    const more = at + 1 < films.length || !place[films[at]?.key ?? ""];
    const move = (key: string, where: Place) => setPlace((p) => {
      // Moving a left-out film back in only works while there's space, and the wall only while it has space too.
      if (where !== "skip" && p[key] === "skip" && placed(p) >= room) return p;
      if (where === "poster" && p[key] !== "poster" && wallLeft <= 0) return p;
      return { ...p, [key]: where };
    });
    return (
      <div className="sort-review">
        <p className="sort-sum">{picks.length === 0 ? "Nothing picked yet." : `${onWall} on the wall · ${inPile} in the DVD pile. Change any of them before they go in.`}</p>
        {films.filter((f) => place[f.key]).length > 0 && (
          <ul className="pick-list sort-list">
            {films.filter((f) => place[f.key]).map((f) => (
              <li key={f.key}>
                <div className="sort-row">
                  {f.cover_url ? <img src={f.cover_url} alt="" loading="lazy" /> : <span className="noart" aria-hidden="true" />}
                  <span><b>{f.title}</b><span className="muted">{f.subtitle}</span></span>
                </div>
                <div className="chips sort-where" role="group" aria-label={`Where ${f.title} goes`}>
                  <button type="button" className="chip" aria-pressed={place[f.key] === "poster"} disabled={place[f.key] !== "poster" && wallLeft <= 0} onClick={() => move(f.key, "poster")}>Wall</button>
                  <button type="button" className="chip" aria-pressed={place[f.key] === "scene"} onClick={() => move(f.key, "scene")}>DVD pile</button>
                  <button type="button" className="chip" aria-pressed={place[f.key] === "skip"} onClick={() => move(f.key, "skip")}>Leave out</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="row split">
          <span className="hint">{full ? "Your room is full now." : more ? <button type="button" className="linkish" onClick={() => setReviewing(false)}>Keep sorting</button> : `${room - placed(place)} spaces left in your room`}</span>
          <div className="row">
            <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>
            <button className="btn" type="button" disabled={busy || picks.length === 0}
              onClick={() => onPut(picks.map((c) => ({ c, type: place[c.key] as PieceType })))}>
              {busy ? "Bringing in…" : `Put ${picks.length} in my room`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const lean = Math.max(-1, Math.min(1, dx / 90));
  return (
    <div className="sorter">
      <div className="sort-top">
        <span>{at + 1} of {films.length}</span>
        <span>{onWall} on the wall · {inPile} in the DVD pile</span>
      </div>
      <div className="sort-stage">
        <div
          className={`sort-card${leaving ? ` leaving-${leaving}` : ""}${dx !== 0 ? " dragging" : ""}`}
          style={leaving ? undefined : { transform: `translateX(${dx}px) rotate(${dx / 22}deg)` }}
          onPointerDown={(e) => { start.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (start.current !== null) setDx(e.clientX - start.current); }}
          onPointerUp={() => { const d = dx; start.current = null; if (d > 90) decide("poster"); else if (d < -90) decide("scene"); else setDx(0); }}
          onPointerCancel={() => { start.current = null; setDx(0); }}
        >
          <span className="sort-flag left" style={{ opacity: Math.max(0, -lean) }}>DVD pile</span>
          <span className="sort-flag right" style={{ opacity: Math.max(0, lean) }}>{wallLeft <= 0 ? "Wall full" : "Wall"}</span>
          {film.cover_url ? <img src={film.cover_url} alt="" draggable={false} /> : <span className="noart" aria-hidden="true" />}
          <b>{film.title}</b>
          <span className="muted">{[film.subtitle, film.note].filter(Boolean).join(" · ")}</span>
        </div>
      </div>
      <div className="sort-actions">
        <button className="btn ghost" type="button" onClick={() => decide("scene")}>← DVD pile</button>
        <button className="btn ghost small" type="button" onClick={() => decide("skip")}>Skip</button>
        <button className="btn" type="button" disabled={wallLeft <= 0} onClick={() => decide("poster")}>{wallLeft <= 0 ? "Wall full" : "Wall →"}</button>
      </div>
      <p className="hint sort-legend">
        {wallLeft <= 0
          ? "The wall is full (it holds 12), so the rest can go in the DVD pile."
          : <>On the wall it hangs as a framed poster ({wallLeft === 1 ? "1 space left" : `${wallLeft} spaces left`}); in the DVD pile it&rsquo;s ready to play on your TV. Swipe the card, or tap.</>}
      </p>
      {history.length > 0 && (
        <div className="sort-foot">
          <button type="button" className="linkish" onClick={undo}>Undo</button>
          <button type="button" className="linkish" onClick={() => setReviewing(true)}>Done sorting</button>
        </div>
      )}
    </div>
  );
}
