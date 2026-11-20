"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { asRoom, FAMOUS, type FamousRoom } from "@/lib/famous";
import { useT } from "@/lib/i18n";
import { useRoomColors } from "@/lib/room-colors";
import { roomStyle, THEMES } from "@/lib/themes";
import { track } from "@/lib/track";
import type { Piece } from "@/lib/types";
import { useAuth } from "./auth";
import { Bookcase } from "./bookcase";
import { PieceDetail } from "./piece-detail";
import { PieceView } from "./piece-view";
import { TasteMatchCard } from "./taste-match";

/* eslint-disable @next/next/no-img-element -- covers from TMDB and Open Library */

const NO_URLS: Record<string, string> = {};

/** A famous room: a published list, hung like a room. Anyone can step in; signed in, you see how alike you are. */
export function FamousRoomView({ room: f }: { room: FamousRoom }) {
  const t = useT();
  const { profile } = useAuth();
  const room = asRoom(f);
  useRoomColors(room.theme);
  const [detailId, setDetailId] = useState<string | null>(null);
  useEffect(() => { track("example", { detail: `famous:${f.slug}` }); }, [f.slug]);

  const books = f.pieces.filter((p) => p.type === "book");
  // A room of films hangs them all; a room of books also hangs a few covers above the shelf.
  const wall: Piece[] = f.pieces.filter((p) => p.type === "poster");
  const hung = wall.length ? wall : books.slice(0, 6);
  const detail = f.pieces.find((p) => p.id === detailId) ?? null;
  const others = FAMOUS.filter((o) => o.slug !== f.slug);

  return (
    <div>
      <section className="door">
        <div>
          <Link className="back mono" href="/famous">← {t("Famous rooms")}</Link>
          <p className="who">{f.person} · {t("put together by Bottega")}</p>
          <h1>{f.name}</h1>
          <p className="tag">{t(f.tagline)}</p>
          <p className="famous-source">{t("Source:")} <a href={f.sourceUrl} target="_blank" rel="noreferrer">{t(f.source)}</a></p>
        </div>
      </section>

      <TasteMatchCard meId={profile?.id ?? null} meName={profile?.username ?? null}
        owner={{ id: `famous:${f.slug}`, username: f.slug, name: f.short }} pieces={f.pieces} />

      <section className="room" style={roomStyle(room)} aria-label={f.name}>
        <div className={`wall p-${room.wallpaper}`}>
          <div className="pieces" aria-label={t("On the wall")}>
            {hung.map((p) => <PieceView key={p.id} piece={p} urls={NO_URLS} onOpen={() => setDetailId(p.id)} />)}
          </div>
          {books.length > 0 && (
            <div className="furniture">
              <Bookcase books={books} isOwner={false} onOpen={(p) => setDetailId(p.id)} onAdd={() => {}} />
            </div>
          )}
        </div>
        <div className="floor" aria-hidden="true" />
      </section>

      {!profile && (
        <div className="example-foot">
          <Link className="btn" href="/" onClick={() => track("make_yours", { detail: `famous:${f.slug}` })}>{t("Make my own room")}</Link>
        </div>
      )}

      <FamousRooms rooms={others} title={t("Other famous rooms")} />

      {detail && (
        <PieceDetail piece={detail} ownerName={undefined} urls={NO_URLS} isOwner={false} playing={false}
          canMoveEarlier={false} canMoveLater={false} onClose={() => setDetailId(null)}
          onPlay={() => {}} onEdit={() => {}} onMove={() => {}} onDelete={async () => {}} />
      )}
    </div>
  );
}

/** A row of famous rooms, for the Library, the welcome page and the end of a famous room. */
export function FamousRooms({ rooms = FAMOUS, title, heading = true }: { rooms?: FamousRoom[]; title?: string; heading?: boolean }) {
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
