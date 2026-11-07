"use client";

import type { CSSProperties } from "react";
import { formatTime, sceneEmbed } from "@/lib/lookup";
import { imageOf, wobble } from "@/lib/piece-media";
import type { Piece } from "@/lib/types";

/* eslint-disable @next/next/no-img-element -- signed or remote stills */

const CASES = ["#14213D", "#3D1F1F", "#1F3324", "#2A2A2A", "#3B2F4A", "#4A3B1F"];
const CARTS = ["#B23A48", "#2F5D8A", "#E0A100", "#3E7D4F", "#6A4C93", "#D65A31"];

export function ScreenCorner({
  scenes,
  games,
  urls,
  tvId,
  tvOn,
  isOwner,
  onInsert,
  onPower,
  onOpen,
  onAddScene,
  onAddGame,
  extraFilm,
  note,
}: {
  scenes: Piece[];
  games: Piece[];
  urls: Record<string, string>;
  tvId: string | null;
  tvOn: boolean;
  isOwner: boolean;
  onInsert: (piece: Piece) => void;
  onPower: () => void;
  onOpen: (piece: Piece) => void;
  onAddScene: () => void;
  onAddGame: () => void;
  /** A poster the owner left in the TV. It isn't a DVD in the pile, but it shows on the screen. */
  extraFilm?: Piece | null;
  /** e.g. "In the TV since Tuesday". */
  note?: string | null;
}) {
  const current = scenes.find((s) => s.id === tvId) ?? (extraFilm && extraFilm.id === tvId ? extraFilm : null);
  const still = current ? imageOf(current, urls) : null;
  const src = current && tvOn ? sceneEmbed(current.link, current.clip_start, current.clip_end) : null;
  const span = current && current.clip_start != null
    ? `${formatTime(current.clip_start)}${current.clip_end != null ? `–${formatTime(current.clip_end)}` : ""}`
    : "";

  return (
    <section className="corner screen-corner" aria-label="Television and films">
      <div className="screen-set">
        <div className="tv">
          <span className="antenna" aria-hidden="true" />
          <div className="tv-body">
            <div className={`tv-screen${tvOn && current ? " on" : ""}${current?.type === "poster" ? " poster" : ""}`}>
              {src ? (
                <iframe
                  key={current!.id}
                  src={src}
                  title={`${current!.title} scene`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : still ? (
                <img src={still} alt="" />
              ) : null}
              {!src && <span className="glare" aria-hidden="true" />}
              <span className="scanlines" aria-hidden="true" />
            </div>
            <div className="tv-panel">
              <button
                type="button"
                className="knob power"
                onClick={onPower}
                disabled={!current}
                aria-label={tvOn ? "Turn the TV off" : current ? `Play ${current.title}` : "Turn on (insert a DVD first)"}
              />
              <span className="knob" aria-hidden="true" />
              <span className="grille" aria-hidden="true" />
            </div>
          </div>
          <span className="tv-feet" aria-hidden="true" />
          <span className="tv-stand" aria-hidden="true"><span /><span /></span>
        </div>

        <div className="media-stack">
        <div className="pile" role="list" aria-label="DVDs">
          {isOwner && (
            <div role="listitem"><button type="button" className="dvd add" onClick={onAddScene}>+ scene</button></div>
          )}
          {scenes.map((s) => {
            const w = wobble(s.id, 1000);
            return (
              <div role="listitem" key={s.id}>
                <button
                  type="button"
                  className={`dvd${s.id === tvId ? " in" : ""}`}
                  onClick={() => (s.link ? onInsert(s) : onOpen(s))}
                  aria-label={s.link ? `Play ${s.title} on the TV` : `${s.title}, open details`}
                  style={{ "--case": CASES[w % CASES.length], marginLeft: (w % 14) - 4, rotate: `${((w >> 3) % 5) - 2}deg` } as CSSProperties}
                >
                  <span>{s.title}</span>
                </button>
              </div>
            );
          })}
        </div>

        {(games.length > 0 || isOwner) && (
          <div className="carts" role="list" aria-label="Games">
            {games.map((g) => (
              <div role="listitem" key={g.id}>
                <button type="button" className="cart-mini" onClick={() => onOpen(g)} aria-label={g.title} title={g.title}
                  style={{ "--cart": CARTS[wobble(g.id, CARTS.length)] } as CSSProperties}>
                  <span>{g.title}</span>
                </button>
              </div>
            ))}
            {isOwner && (
              <div role="listitem"><button type="button" className="cart-mini add" onClick={onAddGame} aria-label="Add a game">+</button></div>
            )}
          </div>
        )}
        </div>
      </div>

      <div className={`now${current ? "" : " empty"}`} aria-live="polite">
        {current ? (
          <>
            <span className="mono">{tvOn ? "Now showing" : note ?? "In the player"}{span ? ` · ${span}` : ""}</span>
            <b>{current.title}</b>
            {current.subtitle && <span className="muted-ink">{current.subtitle}</span>}
            <button type="button" className="linkish" onClick={() => onOpen(current)}>{current.type === "poster" ? "About this film" : "About this scene"}</button>
          </>
        ) : null}
      </div>
    </section>
  );
}
