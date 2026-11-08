"use client";

import { useState } from "react";
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

const stars = (rating: number | null) => (rating ? "★".repeat(Math.floor(rating)) + (rating % 1 ? "½" : "") : "");

export function ImportSheet({ ownerId, pieces, onClose }: { ownerId: string; pieces: Piece[]; onClose: () => void }) {
  const [source, setSource] = useState<Source>("letterboxd");
  const [username, setUsername] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [filmsAs, setFilmsAs] = useState<PieceType>("scene");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const room = MAX_PIECES - pieces.length;
  const type: PieceType = source === "goodreads" ? "book" : filmsAs;
  const alreadyIn = new Set(pieces.map((p) => `${p.type}:${p.title.toLowerCase()}`));
  const isIn = (c: Candidate) => alreadyIn.has(`${type}:${c.title.toLowerCase()}`);

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
      show(
        films.map((f) => ({
          key: f.id, title: f.title, subtitle: f.subtitle, cover_url: f.cover_url, link: f.link,
          note: [stars(f.rating), f.liked ? "♥" : ""].filter(Boolean).join(" "),
          suggested: f.liked || (f.rating ?? 0) >= 4,
        })),
        12,
      );
      setMsg({ kind: "ok", text: `Found ${films.length} films from ${user}'s diary. Your likes and 4-star-plus films are picked.` });
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

  async function save() {
    const picked = (candidates ?? []).filter((c) => chosen.has(c.key) && !isIn(c));
    if (!picked.length) return setMsg({ kind: "err", text: "Pick at least one." });
    setBusy(true);
    const base = Date.now() / 1000;
    const rows = picked.map((c, i) => ({
      owner_id: ownerId,
      type,
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
    onClose();
  }

  const where = type === "book" ? "on your bookshelf" : type === "scene" ? "in the DVD pile" : "on your wall";

  return (
    <Sheet onClose={onClose} onSubmit={candidates ? save : source === "letterboxd" ? findFilms : undefined} label="Bring in your favorites">
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

      {source === "letterboxd" && candidates && (
        <div className="field">
          <span className="label">Put them</span>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={filmsAs === "scene"} onClick={() => setFilmsAs("scene")}>In the DVD pile</button>
            <button type="button" className="chip" aria-pressed={filmsAs === "poster"} onClick={() => setFilmsAs("poster")}>On the wall as posters</button>
          </div>
        </div>
      )}

      <p className={`msg ${msg?.kind ?? ""}`} aria-live="polite">{msg?.text}</p>

      {candidates && (
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

      <div className="row split">
        <span className="hint">{room > 0 ? `${room} spaces left in your room` : "Your room is full. Remove something first."}</span>
        <div className="row">
          <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
          {candidates && (
            <button className="btn" type="submit" disabled={busy || chosen.size === 0}>
              {busy ? "Bringing in…" : `Put ${chosen.size} ${where}`}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
