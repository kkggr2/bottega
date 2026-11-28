"use client";

import type { LeaveAction } from "./music-corner";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { formatTime, sceneEmbed, youtubeId } from "@/lib/lookup";
import { imageOf, wobble } from "@/lib/piece-media";
import type { Piece } from "@/lib/types";
import { AreaEditButton } from "./area-editor";
import { dvdLook, dvdSpineTitle } from "@/lib/dvd-fonts";
import { episodeCode, posterUrl, watchPath, type Watching } from "@/lib/watching";

/* eslint-disable @next/next/no-img-element -- signed or remote stills */

/** DVD covers: a plain colour and the ink its title is printed in (cream, black, red, navy, sage, pink, mustard, lilac). */
const COVERS: [string, string][] = [
  ["#F3E9D7", "#2A1D13"], ["#1E1B1A", "#F3E3C2"], ["#B23A3A", "#FBEFDF"], ["#1F3557", "#F5D38A"],
  ["#B5D3A7", "#22351B"], ["#EBC1D2", "#5A1E33"], ["#F2C65A", "#3A2A10"], ["#CDB5E3", "#2F2148"],
];
const CARTS = ["#B23A48", "#2F5D8A", "#E0A100", "#3E7D4F", "#6A4C93", "#D65A31"];

/** For a poster left in the TV: its trailer, and a wide still from the film to show while it isn't playing. */
type FilmExtras = { trailer: string | null; still: string | null };
const extras = new Map<string, Promise<FilmExtras>>();
function tmdbId(link: string | null): string | null {
  const m = link?.match(/themoviedb\.org\/(movie|tv)\/(\d+)/);
  if (m) return `${m[1]}:${m[2]}`;
  const lb = link?.match(/letterboxd\.com\/tmdb\/(\d+)/);
  return lb ? `movie:${lb[1]}` : null;
}
/** Which film this poster is: from its link, or else by searching its title (and year, if the subtitle has one). */
async function findFilm(poster: Piece): Promise<string | null> {
  const id = tmdbId(poster.link);
  if (id) return id;
  const res = await fetch(`/api/films?q=${encodeURIComponent(poster.title)}`);
  if (!res.ok) return null;
  const { results } = (await res.json()) as { results: { id: string; title: string; subtitle: string }[] };
  const year = poster.subtitle.match(/\b(19|20)\d{2}\b/)?.[0];
  const same = (r: { title: string }) => r.title.toLowerCase() === poster.title.toLowerCase();
  const pick = results.find((r) => same(r) && (!year || r.subtitle.includes(year)))
    ?? (year ? results.find((r) => r.subtitle.includes(year)) : undefined)
    ?? results.find(same)
    ?? results[0];
  return pick?.id ?? null;
}
function extrasFor(poster: Piece): Promise<FilmExtras> {
  const key = poster.link || `${poster.title}|${poster.subtitle}`;
  if (!extras.has(key)) {
    extras.set(key, findFilm(poster)
      .then((id) => (id ? fetch(`/api/films?id=${id}`) : null))
      .then((r) => (r?.ok ? r.json() : null))
      .then((d: { trailer?: string | null; stills?: string[] } | null) => ({ trailer: d?.trailer ?? null, still: d?.stills?.[0] ?? null }))
      .catch(() => ({ trailer: null, still: null })));
  }
  return extras.get(key)!;
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
  leave = null,
  live = null,
  moments = [],
  onEdit,
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
  /** For the owner: leave this film in the TV. */
  leave?: LeaveAction;
  /** What the owner is watching in Margins right now. It's on the TV until someone puts a DVD in. */
  live?: Watching | null;
  /** Lines the owner wrote in Margins, pinned like ticket stubs. Only the show and the minute show here. */
  moments?: Piece[];
  /** For the owner: edit the whole DVD pile at once. */
  onEdit?: () => void;
}) {
  // What's in the player: the chosen DVD or poster, otherwise the first scene that can play.
  const chosen = scenes.find((s) => s.id === tvId) ?? (extraFilm && extraFilm.id === tvId ? extraFilm : null);
  const current = chosen ?? scenes.find((s) => s.link && youtubeId(s.link)) ?? null;
  // A poster plays its film's trailer, and shows a wide still from the film (not the tall poster) while it isn't playing.
  const [film, setFilm] = useState<({ for: string } & FilmExtras) | null>(null);
  const poster = current?.type === "poster" ? current : null;
  useEffect(() => {
    if (!poster) return;
    let live = true;
    void extrasFor(poster).then((x) => { if (live) setFilm({ for: poster.id, ...x }); });
    return () => { live = false; };
  }, [poster]);
  const posterFilm = poster && film?.for === poster.id ? film : null;
  const own = current ? imageOf(current, urls) : null;
  const filmStill = posterFilm?.still ?? null;
  const still = poster ? filmStill ?? (posterFilm ? own : null) : own;
  // A tall picture is shown whole, over a soft blur of itself, never cut off.
  const tall = Boolean(poster && !filmStill);
  const playLink = poster ? posterFilm?.trailer ?? null : current?.link ?? null;
  const clipStart = current?.type === "poster" ? null : current?.clip_start ?? null;
  const clipEnd = current?.type === "poster" ? null : current?.clip_end ?? null;

  // The TV is on when you walk in, sound off. Tapping turns the sound on (one sound at a time with the record).
  const quiet = useSyncExternalStore(subscribeMotion, quietPreferred, () => true);
  const withSound = tvOn && Boolean(playLink);
  // Phones won't start a fresh player with sound, so it always starts muted and the sound is turned up inside it.
  const src = !current || (quiet && !withSound) ? null : sceneEmbed(playLink, clipStart, clipEnd, true, true);
  const soundOn = () => { if (current) onInsert(current); };
  const span = current && current.clip_start != null
    ? `${formatTime(current.clip_start)}${current.clip_end != null ? `–${formatTime(current.clip_end)}` : ""}`
    : "";

  const livePoster = live ? posterUrl(live.poster_path) : null;

  return (
    <section className="corner screen-corner" aria-label="Television and films">
      {isOwner && onEdit && scenes.length > 0 && <AreaEditButton area="screen" onClick={onEdit} />}
      <div className="screen-set">
        <div className="tv">
          <span className="antenna" aria-hidden="true" />
          <div className="tv-body">
            <div className={`tv-screen${src && !live ? " on" : ""}`}>
              {live ? (
                <>
                  {livePoster && <Still src={livePoster} tall />}
                  <span className="tv-live" aria-hidden="true">{"\u25CF"} Live</span>
                </>
              ) : src ? (
                <Broadcast
                  key={current!.id}
                  src={src}
                  still={still}
                  tall={tall}
                  muted={!withSound}
                  title={`${current!.title} scene`}
                  onSound={soundOn}
                />
              ) : still ? (
                <Still src={still} tall={tall} />
              ) : null}
              {(!src || live) && <span className="glare" aria-hidden="true" />}
              <span className="scanlines" aria-hidden="true" />
              {!live && current && playLink && !src && (
                <button type="button" className="tv-tap" onClick={soundOn} aria-label={`Play ${current.title}`}>
                  <span className="tv-sound">{"\u25B6\uFE0E"} Play</span>
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
        {/* DVDs on a shelf, spines out, without photos: the black DVD band at the top, the film's colour, the title
            running down the spine in a typeface from its era, and a tiny disc at the foot. The one in the player is
            pulled halfway out. */}
        <div className="dvds" role="list" aria-label="DVDs">
          {scenes.map((s) => {
            const w = wobble(s.id, 1000);
            const [cover, ink] = COVERS[w % COVERS.length];
            const look = dvdLook(s.subtitle, w);
            const fit = dvdSpineTitle(s.title, look);
            return (
              <div role="listitem" key={s.id}>
                <button
                  type="button"
                  className={`dvd f-${look}${s.id === tvId ? " in" : ""}`}
                  onClick={() => (s.link ? onInsert(s) : onOpen(s))}
                  aria-label={s.link ? `Play ${s.title} on the TV` : `${s.title}, open details`}
                  title={[s.title, s.subtitle].filter(Boolean).join(" · ")}
                  style={{ "--cover": cover, "--ink": ink, "--ts": `${fit.size}px`, "--lines": fit.lines } as CSSProperties}
                >
                  <span className="dvd-spine" aria-hidden="true">
                    <span className="dvd-logo">DVD</span>
                    <span className="dvd-title">{s.title}</span>
                    <span className="dvd-dot" />
                  </span>
                </button>
              </div>
            );
          })}
          {isOwner && (
            <div role="listitem">
              <button type="button" className="dvd add" onClick={onAddScene} aria-label="Add a scene">
                <span className="dvd-spine" aria-hidden="true">+</span>
              </button>
            </div>
          )}
        </div>

        {moments.length > 0 && (
          <div className="stubs" role="list" aria-label="Moments from Margins">
            {moments.map((m) => (
              <div role="listitem" key={m.id}>
                <button type="button" className="stub" onClick={() => onOpen(m)} aria-label={`${m.title}, ${m.subtitle}`}
                  style={{ rotate: `${(wobble(m.id, 5) - 2) * 1.2}deg` } as CSSProperties}>
                  <b>{m.title}</b>
                  <span className="mono">{m.subtitle}</span>
                </button>
              </div>
            ))}
          </div>
        )}

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

      <div className={`now${current || live ? "" : " empty"}`} aria-live="polite">
        {live ? (
          <>
            <span className="mono">{isOwner ? "You're watching" : "Watching now"} · Margins</span>
            <b>{live.show_name ?? "A TV series"}</b>
            <span className="muted-ink">{episodeCode(live)}</span>
            {!isOwner && <a className="btn small now-leave" href={watchPath(live)}>Watch along</a>}
          </>
        ) : current ? (
          <>
            <span className="mono">{src && !note ? "Now showing" : note ?? "In the player"}{span ? ` · ${span}` : ""}</span>
            <b>{current.title}</b>
            {current.subtitle && <span className="muted-ink">{current.subtitle}</span>}
            {leave && (leave.wait
              ? <span className="now-wait">{leave.label}: {`again in ${leave.wait}`}</span>
              : <button type="button" className="btn small now-leave" onClick={leave.onClick}>{leave.label}</button>)}
            <button type="button" className="linkish" onClick={() => onOpen(current)}>{current.type === "poster" ? "About this film" : "About this scene"}</button>
          </>
        ) : null}
      </div>
    </section>
  );
}

const YT_ORIGIN = "https://www.youtube-nocookie.com";

/*
 * The scene on the screen, filling the glass, without YouTube's loading screen and title bar.
 * The still stays up until the video is really playing, then fades. The muted player is three screens tall,
 * so its title bar and logo sit off the screen while the picture fills it.
 * It always starts muted (phones won't autoplay sound); sound is turned on through the player's API.
 * If the phone won't start the video by itself (Low Power Mode),
 * the still says Play and lets the tap through to the player underneath, so one tap starts it.
 */
function Broadcast({ src, still, tall, muted, title, onSound }: {
  src: string; still: string | null; tall: boolean; muted: boolean; title: string; onSound: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(false);
  const [stuck, setStuck] = useState(false);
  const full = `${src}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

  useEffect(() => {
    let clock: number | null = null;
    let started = false;
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
        if (state === 1 || moved) {
          started = true;
          setPlaying(true);
          setStuck(false);
        }
        // At the end, go round again from the scene's start, instead of showing YouTube's replay screen.
        if (state === 0) {
          const start = Number(new URL(src).searchParams.get("start") ?? 0) || 0;
          const post = (func: string, args: unknown[] = []) =>
            frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), YT_ORIGIN);
          post("seekTo", [start, true]);
          post("playVideo");
        }
      } catch {
        // Not a player message.
      }
    };
    window.addEventListener("message", onMessage);
    const timer = setTimeout(() => { if (!started) setStuck(true); }, 3500);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
  }, [src]);

  // Ask the player to report when it starts.
  const send = (message: object) => frame.current?.contentWindow?.postMessage(JSON.stringify(message), YT_ORIGIN);
  const listen = () => send({ event: "listening", id: 1, channel: "widget" });
  const command = (func: string, args: unknown[] = []) => send({ event: "command", func, args });
  const sound = (on: boolean) => {
    if (on) { command("unMute"); command("setVolume", [100]); command("playVideo"); }
    else command("mute");
  };

  // The phone pauses a silent video scrolled off screen; start it again when the TV comes back into view.
  useEffect(() => {
    const el = frame.current;
    if (!muted || !el || typeof IntersectionObserver === "undefined") return;
    const seen = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) command("playVideo"); }, { threshold: 0.3 });
    seen.observe(el);
    return () => seen.disconnect();
  }, [muted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sound on or off without reloading the player. Sent again once it's playing, in case it wasn't ready.
  useEffect(() => { sound(!muted); }, [muted, playing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <iframe
        ref={frame}
        className="tall"
        src={full}
        title={title}
        onLoad={listen}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        tabIndex={muted && playing ? -1 : undefined}
        // Playing quietly, a tap means "sound on" (the button below), not "pause".
        style={{ pointerEvents: muted && playing ? "none" : "auto" }}
      />
      <span className={`tv-cover${playing ? " gone" : ""}`} aria-hidden="true">
        {still && <Still src={still} tall={tall} />}
        {stuck && <span className="tv-sound">{"\u25B6\uFE0E"} Play</span>}
      </span>
      {muted && playing && (
        <button type="button" className="tv-tap" onClick={() => { sound(true); onSound(); }} aria-label={`Play ${title} with sound`}>
          <span className="tv-sound">Tap for sound</span>
        </button>
      )}
    </>
  );
}

/** A picture on the glass. Wide ones fill it; a tall poster sits whole over a blur of itself. */
function Still({ src, tall }: { src: string; tall: boolean }) {
  if (!tall) return <img src={src} alt="" />;
  return (
    <>
      <img src={src} alt="" className="still-blur" />
      <img src={src} alt="" className="still-whole" />
    </>
  );
}
