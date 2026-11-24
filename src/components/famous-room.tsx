"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { asRoom, LISTED, type FamousRoom } from "@/lib/famous";
import { useT } from "@/lib/i18n";
import { tap } from "@/lib/native";
import { dropNeedle } from "@/lib/needle";
import { NOW_WORDS } from "@/lib/now";
import { audioOf } from "@/lib/piece-media";
import { useRoomColors } from "@/lib/room-colors";
import { roomStyle, THEMES } from "@/lib/themes";
import { track } from "@/lib/track";
import type { Piece } from "@/lib/types";
import { useAuth } from "./auth";
import { Bookcase } from "./bookcase";
import { MusicCorner } from "./music-corner";
import { PieceDetail } from "./piece-detail";
import { PieceView } from "./piece-view";
import { ScreenCorner } from "./screen-corner";
import { TasteMatchCard } from "./taste-match";

/* eslint-disable @next/next/no-img-element -- covers from TMDB, Open Library, Apple Music and the publishers themselves */

const NO_URLS: Record<string, string> = {};

/** Credit labels in a piece's second paragraph ("Cover: … · Foreword: …"), for the Spanish version. */
const ES_LABELS: [RegExp, string][] = [
  [/Translation and foreword:/g, "Traducción y prólogo:"],
  [/Cover and illustrations:/g, "Portada e ilustraciones:"],
  [/Guest editor:/g, "Editora invitada:"],
  [/Foreword:/g, "Prólogo:"],
  [/Cover:/g, "Portada:"],
];

/** The room's pieces in the chosen language: Spanish swaps each line, keeps the credits and translates their labels. */
function inLanguage(pieces: Piece[], es: FamousRoom["es"] | null): Piece[] {
  if (!es) return pieces;
  return pieces.map((p) => {
    if (p.type === "poem") return p; // A poem stays in the language it was written in.
    const [, ...credits] = p.body.split("\n\n");
    const line = es.lines[p.title] ?? p.body.split("\n\n")[0];
    const creditLine = credits.join("\n\n");
    const translated = ES_LABELS.reduce((s, [from, to]) => s.replace(from, to), creditLine);
    return { ...p, body: [line, translated].filter(Boolean).join("\n\n") };
  });
}

/**
 * A famous room: a published list (or a library's shelf), hung like a real room. The wall, the bookcase with its
 * armchair, the TV and the turntable all work as in anyone's room; whatever the room leaves out is already on.
 * Anyone can step in; signed in, you see how alike you are.
 */
export function FamousRoomView({ room: f }: { room: FamousRoom }) {
  const t = useT();
  const { profile } = useAuth();
  const room = asRoom(f);
  useRoomColors(room.theme);
  const [lang, setLang] = useState<"en" | "es">("en");
  const es = lang === "es" && f.es ? f.es : null;
  const pieces = useMemo(() => inLanguage(f.pieces, es), [f.pieces, es]);
  const byTitle = (title?: string) => (title ? pieces.find((p) => p.title === title) ?? null : null);
  const nowSong = byTitle(f.now?.song);
  const nowFilm = byTitle(f.now?.film);
  const nowBook = byTitle(f.now?.book);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(nowSong?.id ?? null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [tvId, setTvId] = useState<string | null>(nowFilm?.id ?? null);
  const [tvOn, setTvOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audioRef.current?.pause(), []);
  useEffect(() => { track("example", { detail: `famous:${f.slug}` }); }, [f.slug]);

  const of = (type: Piece["type"]) => pieces.filter((p) => p.type === type);
  const books = of("book"), songs = of("song"), scenes = of("scene"), games = of("game"), poems = of("poem");
  // Posters and poems hang on the wall. A room of books also hangs a few covers there, above the shelf.
  const posters = of("poster");
  const wall: Piece[] = [...(posters.length ? posters : books.slice(0, 6)), ...poems];
  const detail = pieces.find((p) => p.id === detailId) ?? null;
  const others = LISTED.filter((o) => o.slug !== f.slug);

  const stop = () => { audioRef.current?.pause(); setPlayingId(null); };
  const toggle = (p: Piece) => {
    const src = audioOf(p, NO_URLS);
    if (!src) return setDetailId(p.id);
    if (playingId === p.id) return stop();
    audioRef.current?.pause();
    setRecordId(p.id);
    setTvOn(false); // one sound at a time
    const audio = new Audio(src);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    tap();
    setPlayingId(p.id);
    dropNeedle(audio).catch(() => setPlayingId(null));
  };
  const insert = (p: Piece) => { stop(); setTvId(p.id); setTvOn(Boolean(p.link)); tap(); };

  const name = es ? es.name : f.name;
  const tagline = es ? es.tagline : t(f.tagline);
  const source = es ? es.source : t(f.source);
  const draft = es?.draft ?? f.draft;

  return (
    <div lang={es ? "es" : undefined}>
      <section className="door">
        <div>
          <Link className="back mono" href="/famous">← {t("Famous rooms")}</Link>
          <p className="who">{f.person} · {es ? "reunido por Bottega" : t("put together by Bottega")}</p>
          <h1>{name}</h1>
          <p className="tag">{tagline}</p>
          {draft && <p className="msg ok famous-draft">{draft}</p>}
          <p className="famous-source">{es ? "Fuente:" : t("Source:")} <a href={f.sourceUrl} target="_blank" rel="noreferrer">{source}</a></p>
          {f.es && (
            <div className="chips famous-lang" role="group" aria-label="Language">
              <button type="button" className="chip" aria-pressed={lang === "en"} lang="en" onClick={() => setLang("en")}>English</button>
              <button type="button" className="chip" aria-pressed={lang === "es"} lang="es" onClick={() => setLang("es")}>Español</button>
            </div>
          )}
        </div>
      </section>

      <TasteMatchCard meId={profile?.id ?? null} meName={profile?.username ?? null}
        owner={{ id: `famous:${f.slug}`, username: f.slug, name: f.short }} pieces={f.pieces} />

      <section className="room" style={roomStyle(room)} aria-label={name}>
        <div className={`wall p-${room.wallpaper}`}>
          {wall.length > 0 && (
            <div className="pieces" aria-label={t("On the wall")}>
              {wall.map((p) => <PieceView key={p.id} piece={p} urls={NO_URLS} onOpen={() => setDetailId(p.id)} />)}
            </div>
          )}
          {(books.length > 0 || scenes.length > 0 || games.length > 0 || songs.length > 0) && (
            <div className="furniture">
              {books.length > 0 && (
                <Bookcase books={books} isOwner={false} onOpen={(p) => setDetailId(p.id)} onAdd={() => {}}
                  chairBook={nowBook} note={nowBook ? NOW_WORDS.book.where : null} />
              )}
              {(scenes.length > 0 || games.length > 0) && (
                <ScreenCorner scenes={scenes} games={games} urls={NO_URLS} tvId={tvId} tvOn={tvOn} isOwner={false}
                  onInsert={insert} onPower={() => { if (!tvOn) stop(); setTvOn(!tvOn); }} onOpen={(p) => setDetailId(p.id)}
                  onAddScene={() => {}} onAddGame={() => {}} note={tvId && tvId === nowFilm?.id ? NOW_WORDS.film.where : null} />
              )}
              {songs.length > 0 && (
                <MusicCorner songs={songs} urls={NO_URLS} playingId={playingId} currentId={recordId} isOwner={false}
                  onToggle={toggle} onOpen={(p) => setDetailId(p.id)} onAdd={() => {}}
                  note={recordId && recordId === nowSong?.id ? NOW_WORDS.song.where : null} />
              )}
            </div>
          )}
        </div>
        <div className="floor" aria-hidden="true" />
      </section>

      {!profile && (
        <div className="example-foot">
          <Link className="btn" href="/#join" onClick={() => track("make_yours", { detail: `famous:${f.slug}` })}>{t("Make my own room")}</Link>
        </div>
      )}

      <FamousRooms rooms={others} title={t("Other famous rooms")} />

      {detail && (
        <PieceDetail piece={detail} ownerName={undefined} urls={NO_URLS} isOwner={false} playing={playingId === detail.id}
          canMoveEarlier={false} canMoveLater={false} onClose={() => setDetailId(null)}
          onPlay={() => { if (detail.type === "scene") insert(detail); else toggle(detail); setDetailId(null); }}
          onEdit={() => {}} onMove={() => {}} onDelete={async () => {}} />
      )}
    </div>
  );
}

/** A row of famous rooms, for the Library, the welcome page and the end of a famous room. */
export function FamousRooms({ rooms = LISTED, title, heading = true }: { rooms?: FamousRoom[]; title?: string; heading?: boolean }) {
  const t = useT();
  if (!rooms.length) return null;
  return (
    <section className="visit" aria-label={t("Famous rooms")}>
      {heading && (
        <div className="tonight-head">
          <div>
            <p className="smallcaps">{t("Famous rooms")}</p>
            <h2>{title ?? t("Step into the rooms of people whose taste shaped yours")}</h2>
          </div>
        </div>
      )}
      <ul className="visit-row">
        {rooms.map((f) => {
          const th = THEMES[f.theme];
          const covers = f.pieces.filter((p) => p.cover_url).slice(0, 3);
          return (
            <li key={f.slug}>
              <Link href={`/famous/${f.slug}`} className="visit-card" style={{ background: th.wall, color: th.ink }}>
                <span className="visit-covers">
                  {covers.map((p) => <img key={p.id} src={`/api/image?url=${encodeURIComponent(p.cover_url!)}`} alt="" loading="lazy" />)}
                </span>
                <span className="smallcaps visit-label" style={{ color: th.accent }}>{f.person}</span>
                <b>{f.name}</b>
                <span className="visit-blurb">{t(f.tagline)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
