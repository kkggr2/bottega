"use client";

import { useState } from "react";
import { audioOf, imageOf, wobble } from "@/lib/piece-media";
import type { Piece } from "@/lib/types";

/* eslint-disable @next/next/no-img-element -- signed or remote cover art */

export function MusicCorner({
  songs,
  urls,
  playingId,
  currentId,
  isOwner,
  onToggle,
  onOpen,
  onAdd,
}: {
  songs: Piece[];
  urls: Record<string, string>;
  playingId: string | null;
  currentId: string | null;
  isOwner: boolean;
  onToggle: (piece: Piece) => void;
  onOpen: (piece: Piece) => void;
  onAdd: () => void;
}) {
  const current = songs.find((s) => s.id === currentId) ?? null;
  // The sleeves sit stacked in the crate. Tapping it spreads them out so each one is easy to pick.
  const [open, setOpen] = useState(false);
  const stacked = songs.length > 1 && !open;
  const spinning = Boolean(current && playingId === current.id);
  const currentArt = current ? imageOf(current, urls) : null;

  return (
    <section className="corner music-corner" aria-label="Record player">
      <div className="rug" aria-hidden="true" />
      <div className="music-set">
        <div className={`turntable${spinning ? " on" : ""}${current ? " loaded" : ""}`}>
          <button
            type="button"
            className="platter"
            disabled={!current}
            onClick={() => current && onToggle(current)}
            aria-label={current ? `${spinning ? "Pause" : "Play"} ${current.title}` : "No record on the player"}
          >
            <span className="disc">
              <span className="label">{currentArt ? <img src={currentArt} alt="" /> : null}</span>
            </span>
          </button>
          <span className="tonearm" aria-hidden="true" />
          <span className="tt-light" aria-hidden="true" />
        </div>

        <div className={`crate${open ? " open" : ""}`} role="list" aria-label="Records">
          {songs.map((s, i) => {
            const art = imageOf(s, urls);
            const playable = Boolean(audioOf(s, urls));
            const tilt = (wobble(s.id, 9) - 4) * 1.2;
            return (
              <div role="listitem" key={s.id} className={`sleeve-slot${s.id === currentId ? " out" : ""}`}
                style={{ zIndex: songs.length - i, rotate: `${tilt}deg` }}>
                <button
                  type="button"
                  className="sleeve"
                  onClick={() => {
                    if (stacked) return setOpen(true);
                    setOpen(false);
                    if (playable) onToggle(s);
                    else onOpen(s);
                  }}
                  aria-pressed={!stacked && playable ? playingId === s.id : undefined}
                  aria-expanded={stacked ? false : undefined}
                  // While stacked, the front sleeve stands for the whole crate.
                  tabIndex={stacked && i > 0 ? -1 : undefined}
                  aria-hidden={stacked && i > 0 ? true : undefined}
                  aria-label={stacked
                    ? `Flip through ${songs.length} records`
                    : playable ? `Play ${s.title}${s.subtitle ? ` by ${s.subtitle}` : ""}` : `${s.title}, open details`}
                  title={[s.title, s.subtitle].filter(Boolean).join(" · ")}
                >
                  {art ? <img src={art} alt="" loading="lazy" /> : <span className="sleeve-type">{s.title}</span>}
                </button>
              </div>
            );
          })}
          {isOwner && (
            <div role="listitem" className="sleeve-slot">
              <button type="button" className="sleeve add" onClick={onAdd}>+ record</button>
            </div>
          )}
        </div>
      </div>

      <div className={`now${current || open ? "" : " empty"}`} aria-live="polite">
        {current ? (
          <>
            <span className="mono">{spinning ? "Now playing" : "On the turntable"}</span>
            <b>{current.title}</b>
            {current.subtitle && <span className="muted-ink">{current.subtitle}</span>}
            <button type="button" className="linkish" onClick={() => onOpen(current)}>About this song</button>
          </>
        ) : open ? (
          <button type="button" className="linkish" onClick={() => setOpen(false)}>Put them back</button>
        ) : null}
      </div>
    </section>
  );
}
