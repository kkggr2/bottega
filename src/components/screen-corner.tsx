"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { formatTime, sceneEmbed, youtubeId } from "@/lib/lookup";
import { imageOf, wobble } from "@/lib/piece-media";
import type { Piece } from "@/lib/types";

/* eslint-disable @next/next/no-img-element -- signed or remote stills */

const CASES = ["#14213D", "#3D1F1F", "#1F3324", "#2A2A2A", "#3B2F4A", "#4A3B1F"];
const CARTS = ["#B23A48", "#2F5D8A", "#E0A100", "#3E7D4F", "#6A4C93", "#D65A31"];

/** Trailers for posters left in the TV, looked up once per film. */
const trailers = new Map<string, Promise<string | null>>();
function tmdbId(link: string | null): string | null {
  const m = link?.match(/themoviedb\.org\/(movie|tv)\/(\d+)/);
  return m ? `${m[1]}:${m[2]}` : null;
}
function trailerFor(link: string | null): Promise<string | null> {
  const id = tmdbId(link);
  if (!id) return Promise.resolve(null);
  if (!trailers.has(id)) {
    trailers.set(id, fetch(`/api/films?id=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { trailer?: string | null } | null) => d?.trailer ?? null)
      .catch(() => null));
  }
  return trailers.get(id)!;
}

function subscribeMotion(change: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", change);
  return () => mq.removeEventListener("change", change);
}

/** People who asked for less motion, or to save data, get a still until they press play. */
function quietPreferred(): boolean {
  if (typeof window === "undefined") return true;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return Boolean(saveData) || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
  // What's in the player: the chosen DVD or poster, otherwise the first scene that can play.
  const chosen = scenes.find((s) => s.id === tvId) ?? (extraFilm && extraFilm.id === tvId ? extraFilm : null);
  const current = chosen ?? scenes.find((s) => s.link && youtubeId(s.link)) ?? null;
  const still = current ? imageOf(current, urls) : null;

  // A poster plays its film's trailer.
  const [trailer, setTrailer] = useState<{ for: string; link: string | null } | null>(null);
  const posterLink = current?.type === "poster" ? current.link : null;
  useEffect(() => {
    if (!current || !posterLink) return;
    let live = true;
    void trailerFor(posterLink).then((link) => { if (live) setTrailer({ for: current.id, link }); });
    return () => { live = false; };
  }, [current, posterLink]);
  const playLink = current?.type === "poster" ? (trailer?.for === current.id ? trailer.link : null) : current?.link ?? null;
  const clipStart = current?.type === "poster" ? null : current?.clip_start ?? null;
  const clipEnd = current?.type === "poster" ? null : current?.clip_end ?? null;

  // The TV is on when you walk in, sound off. Tapping turns the sound on (one sound at a time with the record).
  const quiet = useSyncExternalStore(subscribeMotion, quietPreferred, () => true);
  const withSound = tvOn && Boolean(playLink);
  const src = !current ? null
    : withSound ? sceneEmbed(playLink, clipStart, clipEnd)
    : quiet ? null
    : sceneEmbed(playLink, clipStart, clipEnd, true, true);
  const soundOn = () => { if (current) onInsert(current); };
  const span = current && current.clip_start != null
    ? `${formatTime(current.clip_start)}${current.clip_end != null ? `–${formatTime(current.clip_end)}` : ""}`
    : "";

  return (
    <section className="corner screen-corner" aria-label="Television and films">
      <div className="screen-set">
        <div className="tv">
          <span className="antenna" aria-hidden="true" />
          <div className="tv-body">
            <div className={`tv-screen${src ? " on" : ""}${current?.type === "poster" && !src ? " poster" : ""}`}>
              {src ? (
                <Broadcast
                  key={`${current!.id}${withSound ? ":sound" : ""}`}
                  src={src}
                  still={still}
                  muted={!withSound}
                  title={`${current!.title} scene`}
                />
              ) : still ? (
                <img src={still} alt="" />
              ) : null}
              {!src && <span className="glare" aria-hidden="true" />}
              <span className="scanlines" aria-hidden="true" />
              {current && playLink && !withSound && (
                <button type="button" className="tv-sound" onClick={soundOn} aria-label={`Play ${current.title} with sound`}>
                  {src ? "Tap for sound" : "▶ Play"}
                </button>
              )}
            </div>
            <div className="tv-panel">
              <button
                type="button"
                className="knob power"
                onClick={() => (withSound ? onPower() : soundOn())}
                disabled={!current || !playLink}
                aria-label={withSound ? "Turn the sound off" : current ? `Play ${current.title} with sound` : "Turn on (insert a DVD first)"}
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
            <span className="mono">{src && !note ? "Now showing" : note ?? "In the player"}{span ? ` · ${span}` : ""}</span>
            <b>{current.title}</b>
            {current.subtitle && <span className="muted-ink">{current.subtitle}</span>}
            <button type="button" className="linkish" onClick={() => onOpen(current)}>{current.type === "poster" ? "About this film" : "About this scene"}</button>
          </>
        ) : null}
      </div>
    </section>
  );
}

const YT_ORIGIN = "https://www.youtube-nocookie.com";

/*
 * The scene on the screen, without YouTube's loading screen and title bar:
 * the still stays up until the video is really playing, then fades, and the muted player is
 * three screens tall so its title bar and logo sit off the screen while the picture fills it.
 */
function Broadcast({ src, still, muted, title }: { src: string; still: string | null; muted: boolean; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(false);
  const full = `${src}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

  useEffect(() => {
    let clock: number | null = null;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== YT_ORIGIN || e.source !== frame.current?.contentWindow || typeof e.data !== "string") return;
      try {
        const msg = JSON.parse(e.data) as { event?: string; info?: unknown };
        const info = msg.event === "infoDelivery" ? (msg.info as { playerState?: number; currentTime?: number } | null) : null;
        const state = msg.event === "onStateChange" ? msg.info : info?.playerState;
        // Playing: the player says so, or its clock moves on.
        const time = info?.currentTime;
        const moved = typeof time === "number" && clock !== null && time > clock;
        if (typeof time === "number") clock = time;
        if (state === 1 || moved) setPlaying(true);
      } catch {
        // Not a player message.
      }
    };
    window.addEventListener("message", onMessage);
    // With sound, don't keep the picture covered if the phone wants a tap on the player itself.
    const reveal = muted ? undefined : setTimeout(() => setPlaying(true), 2500);
    return () => {
      window.removeEventListener("message", onMessage);
      if (reveal) clearTimeout(reveal);
    };
  }, [muted]);

  // Ask the player to report when it starts.
  const listen = () => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), YT_ORIGIN);

  return (
    <>
      <iframe
        ref={frame}
        className={muted ? "tall" : undefined}
        src={full}
        title={title}
        onLoad={listen}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        tabIndex={muted ? -1 : undefined}
      />
      <span className={`tv-cover${playing ? " gone" : ""}`} aria-hidden="true">
        {still && <img src={still} alt="" />}
      </span>
    </>
  );
}
