"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { audioOf } from "@/lib/piece-media";
import { roomStyle } from "@/lib/themes";
import { track } from "@/lib/track";
import type { Piece, PieceType, Room } from "@/lib/types";
import { Bookcase } from "./bookcase";
import { MusicCorner } from "./music-corner";
import { PieceDetail } from "./piece-detail";
import { PieceView } from "./piece-view";
import { ScreenCorner } from "./screen-corner";
import { ShareSheet } from "./share-sheet";

const ROOM: Room = {
  owner_id: "example", name: "The Green Hour", tagline: "An example room. Make yours look nothing like it.",
  theme: "moss", wallpaper: "stripe", visibility: "public",
};

let n = 0;
function piece(type: PieceType, title: string, subtitle: string, extra: Partial<Piece> = {}): Piece {
  n += 1;
  return {
    id: `example-${n}`, owner_id: "example", type, title, subtitle, body: "", image_path: null, audio_path: null,
    link: null, cover_url: null, preview_url: null, clip_start: null, clip_end: null, position: n, created_at: "", ...extra,
  };
}

const mz = (path: string) => `https://is1-ssl.mzstatic.com/image/thumb/${path}/600x600bb.jpg`;
const pv = (path: string) => `https://audio-ssl.itunes.apple.com/itunes-assets/${path}.plus.aac.p.m4a`;
const ol = (id: number) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;

const PIECES: Piece[] = [
  piece("poster", "In the Mood for Love", "Wong Kar-wai · 2000", { cover_url: "https://image.tmdb.org/t/p/w500/8BgGbbWiLNhPtkMkN0gGTnbtvBv.jpg", body: "The corridor, the noodle tins, the slow walk past each other. Every frame looks like a held breath." }),
  piece("poem", "Inventory", "written for this room", {
    body: "A cup with a chip on the lip,\na coat that remembers the rain,\na book left open at the page\nwhere I stopped trusting the plot.\n\nKeep them. They are the map\nof every room I lived in\nbefore this one.",
  }),
  piece("poster", "Paris, Texas", "Wim Wenders · 1984", { cover_url: "https://image.tmdb.org/t/p/w500/sP27Qm4THyRZyHjHYMfIDtJP6YE.jpg", body: "The one-way mirror. He talks to her back, and she slowly understands who is speaking." }),
  piece("song", "Harvest Moon", "Neil Young · 1992", {
    cover_url: mz("Music124/v4/4d/45/41/4d45414c-6364-51cf-2874-7c8aa755caaa/mzi.oetoyyot.jpg"),
    preview_url: pv("AudioPreview221/v4/2d/c9/d8/2dc9d8d2-4833-3f73-9468-1a85dd8fca8d/mzaf_17391071788735687900"),
    body: "The brushed snare sounds like someone sweeping a porch at dusk.",
  }),
  piece("song", "Teardrop", "Massive Attack · 1998", {
    cover_url: mz("Music115/v4/0a/98/55/0a98555b-8d9d-3b46-660a-b91261557d17/00724384559953.rgb.jpg"),
    preview_url: pv("AudioPreview221/v4/a3/a6/91/a3a691b0-8e49-399d-2585-ddcd6694c9f2/mzaf_16325826545413166648"),
  }),
  piece("song", "The Girl from Ipanema", "Stan Getz & João Gilberto · 1964", {
    cover_url: mz("Music116/v4/14/c5/97/14c597a3-22c8-d2a9-dc49-0f8b1496f776/14UMGIM16822.rgb.jpg"),
    preview_url: pv("AudioPreview211/v4/b6/e5/99/b6e599f2-db62-aead-e577-9ac4b8c31dce/mzaf_7124507397759879735"),
  }),
  piece("song", "Motion Sickness", "Phoebe Bridgers · 2017", {
    cover_url: mz("Music221/v4/20/4c/6e/204c6ef3-8e95-4cee-2256-202ca62aebed/60220.jpg"),
    preview_url: pv("AudioPreview211/v4/88/0d/3c/880d3c6d-70f6-4628-a1dc-5b07ef90421c/mzaf_7359776133976251843"),
  }),
  piece("book", "The Remains of the Day", "Kazuo Ishiguro · 1989", { cover_url: ol(95742), body: "A whole life of restraint, told by a man who still can't say what he means." }),
  piece("book", "Giovanni's Room", "James Baldwin · 1956", { cover_url: ol(97395) }),
  piece("book", "The Secret History", "Donna Tartt · 1992", { cover_url: ol(744854) }),
  piece("book", "Normal People", "Sally Rooney · 2018", { cover_url: ol(8794265) }),
  piece("book", "A Little Life", "Hanya Yanagihara · 2015", { cover_url: ol(12065783) }),
  piece("scene", "Big Buck Bunny", "Blender Foundation · 2008", {
    link: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", cover_url: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
    clip_start: 72, clip_end: 120, body: "The butterflies. Pure morning.",
  }),
  piece("scene", "Sintel", "Blender Foundation · 2010", {
    link: "https://www.youtube.com/watch?v=eRsGyueVLvQ", cover_url: "https://i.ytimg.com/vi/eRsGyueVLvQ/hqdefault.jpg", clip_start: 300, clip_end: 370,
  }),
  piece("scene", "Spring", "Blender Studio · 2019", {
    link: "https://www.youtube.com/watch?v=WhWc3b3KhnY", cover_url: "https://i.ytimg.com/vi/WhWc3b3KhnY/hqdefault.jpg", clip_start: 0, clip_end: 60,
  }),
  piece("game", "Outer Wilds", "Mobius Digital · 2019", { body: "Twenty-two minutes, then the sun goes out. You learn the universe by losing it." }),
  piece("game", "Journey", "thatgamecompany · 2012"),
];

const EMPTY_URLS: Record<string, string> = {};

/**
 * The example room. On its own page it has a header; embedded on the landing page it's just the room,
 * and "Make my own room" scrolls to the sign-up form instead.
 */
export function ExampleRoom({ embedded = false, onMakeYours }: { embedded?: boolean; onMakeYours?: () => void } = {}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [tvId, setTvId] = useState<string | null>(null);
  const [tvOn, setTvOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audioRef.current?.pause(), []);
  useEffect(() => {
    if (!embedded) track("example", { detail: "page" });
  }, [embedded]);
  // Count the first time someone actually plays with it.
  const touched = useRef(false);
  const touch = (what: string) => {
    if (touched.current) return;
    touched.current = true;
    track("example", { detail: `${embedded ? "landing" : "page"}:${what}` });
  };

  const urls = EMPTY_URLS;
  const stop = () => { audioRef.current?.pause(); setPlayingId(null); };
  const toggle = (p: Piece) => {
    touch("record");
    const src = audioOf(p, urls);
    if (!src) return setDetailId(p.id);
    if (playingId === p.id) return stop();
    audioRef.current?.pause();
    setRecordId(p.id);
    setTvOn(false);
    const audio = new Audio(src);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    audio.play().then(() => setPlayingId(p.id), () => setPlayingId(null));
  };
  const insert = (p: Piece) => { touch("dvd"); stop(); setTvId(p.id); setTvOn(true); };

  const of = (t: PieceType) => PIECES.filter((p) => p.type === t);
  const detail = PIECES.find((p) => p.id === detailId) ?? null;
  const open = (p: Piece) => { touch("piece"); setDetailId(p.id); };

  return (
    <div>
      {!embedded && <section className="door">
        <div>
          <Link className="back mono" href="/">← Back</Link>
          <p className="mono muted">@example · example room</p>
          <h1>{ROOM.name}</h1>
          <p className="tag">{ROOM.tagline}</p>
        </div>
        <div className="actions">
          <button className="btn ghost" type="button" onClick={() => setSharing(true)}>Preview share picture</button>
          <Link className="btn" href="/" onClick={() => track("make_yours", { detail: "example" })}>Make my own room</Link>
        </div>
      </section>}

      <section className="room" style={roomStyle(ROOM)} aria-label="Example room">
        <div className={`wall p-${ROOM.wallpaper}`}>
          <div className="pieces" aria-label="On the wall">
            {PIECES.filter((p) => p.type === "poster" || p.type === "poem").map((p) => (
              <PieceView key={p.id} piece={p} urls={urls} onOpen={() => open(p)} />
            ))}
          </div>
          <div className="furniture">
            <Bookcase books={of("book")} isOwner={false} onOpen={open} onAdd={() => {}} />
            <ScreenCorner scenes={of("scene")} games={of("game")} urls={urls} tvId={tvId} tvOn={tvOn} isOwner={false}
              onInsert={insert} onPower={() => { if (!tvOn) stop(); setTvOn(!tvOn); }} onOpen={open}
              onAddScene={() => {}} onAddGame={() => {}} />
            <MusicCorner songs={of("song")} urls={urls} playingId={playingId} currentId={recordId} isOwner={false}
              onToggle={toggle} onOpen={open} onAdd={() => {}} />
          </div>
        </div>
        <div className="floor" aria-hidden="true" />
      </section>
      {embedded && (
        <div className="example-foot">
          <button className="btn ghost" type="button" onClick={() => setSharing(true)}>See its share picture</button>
          <button className="btn" type="button" onClick={() => { track("make_yours", { detail: "landing" }); onMakeYours?.(); }}>Make my own room</button>
        </div>
      )}

      {sharing && <ShareSheet room={ROOM} username="example" pieces={PIECES} urls={urls} onClose={() => setSharing(false)} />}
      {detail && (
        <PieceDetail piece={detail} urls={urls} isOwner={false} playing={playingId === detail.id}
          canMoveEarlier={false} canMoveLater={false} onClose={() => setDetailId(null)}
          onPlay={() => { if (detail.type === "scene") insert(detail); else toggle(detail); setDetailId(null); }}
          onEdit={() => {}} onMove={() => {}} onDelete={async () => {}} />
      )}
    </div>
  );
}
