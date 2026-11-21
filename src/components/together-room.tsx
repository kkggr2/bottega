"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { searchBooks, searchFilms, searchSongs, type Found } from "@/lib/lookup";
import { dropNeedle } from "@/lib/needle";
import { audioOf } from "@/lib/piece-media";
import { useRoomColors } from "@/lib/room-colors";
import { roomStyle, WALLPAPERS } from "@/lib/themes";
import {
  answerTogether, asRoom, hangTogether, startTogether, leaveTogether, loadTogether, orderTogether, setTogetherWords, takeDownTogether,
  updateTogetherLook, type TogetherRoom,
} from "@/lib/together";
import { track } from "@/lib/track";
import type { Piece, Profile, ThemeKey, Wallpaper } from "@/lib/types";
import { Bookcase } from "./bookcase";
import { Gate } from "./gate";
import { MusicCorner } from "./music-corner";
import { PieceDetail } from "./piece-detail";
import { PieceView } from "./piece-view";
import { SearchPicker } from "./search-picker";
import { Sheet } from "./sheet";
import { ThemeSwatches } from "./theme-swatches";

/* eslint-disable @next/next/no-img-element -- remote cover art */

const NO_URLS: Record<string, string> = {};
type Kind = "poster" | "book" | "song";

/** /together/[id]: a room two people share. */
export function TogetherRoute() {
  const { id } = useParams<{ id: string }>();
  return <Gate>{(me) => <TogetherView me={me} id={id} />}</Gate>;
}

function TogetherView({ me, id }: { me: Profile; id: string }) {
  const t = useT();
  const router = useRouter();
  const [room, setRoom] = useState<TogetherRoom | null | undefined>(undefined);
  const [adding, setAdding] = useState<Kind | null>(null);
  const [look, setLook] = useState(false);
  const [menu, setMenu] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [wordsFor, setWordsFor] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audioRef.current?.pause(), []);

  const load = useCallback(async () => { setRoom(await loadTogether(id)); }, [id]);
  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open
  useRoomColors(room ? room.theme : null);

  if (room === undefined) return <p className="loading">{t("One moment…")}</p>;
  if (room === null) {
    return (
      <section className="empty-wall">
        <h2>{t("This room isn't here.")}</h2>
        <p>{t("It may have been taken down, or it's only open to friends of the two people who share it.")}</p>
        <Link className="btn" href="/">{t("Back to the Library")}</Link>
      </section>
    );
  }

  const mine = room.members.find((m) => m.user_id === me.id);
  const member = mine?.status === "joined";
  const invited = mine?.status === "invited";
  const names = room.members.map((m) => `@${m.username}`).join(" & ");
  const pieces = room.pieces;
  const of = (k: Kind) => pieces.filter((p) => p.type === k);
  const detail = pieces.find((p) => p.id === detailId) ?? null;
  const index = detail ? pieces.indexOf(detail) : -1;

  async function answer(yes: boolean) {
    const err = await answerTogether(room!.id, yes);
    if (err) return setMsg(err);
    track("friend_request", { detail: yes ? "together:yes" : "together:no" });
    if (yes) void load(); else router.push("/");
  }

  async function leave() {
    if (!confirm(t("Leave this room? Your key goes back. If nobody is left, the room is taken down."))) return;
    const err = await leaveTogether(room!.id);
    if (err) return setMsg(err);
    router.push("/");
  }

  async function move(dir: -1 | 1) {
    if (index < 0) return;
    const next = [...pieces];
    const [p] = next.splice(index, 1);
    next.splice(index + dir, 0, p);
    await orderTogether(next);
    void load();
  }

  function toggle(p: Piece) {
    const src = audioOf(p, NO_URLS);
    if (!src) return setDetailId(p.id);
    if (playingId === p.id) { audioRef.current?.pause(); return setPlayingId(null); }
    audioRef.current?.pause();
    const audio = new Audio(src);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(p.id);
    dropNeedle(audio).catch(() => setPlayingId(null));
  }

  return (
    <div>
      <section className="door">
        <div>
          <Link className="back mono" href="/">← {t("Library")}</Link>
          <p className="who">{names} · {t("a room for two")}</p>
          <h1>{room.name}</h1>
        </div>
        {member && (
          <div className="actions">
            <button className="btn" type="button" onClick={() => setAdding("poster")}>+ {t("Add")}</button>
            <span className="menu-wrap">
              <button className="btn ghost more" type="button" aria-haspopup="menu" aria-expanded={menu} aria-label={t("More")} onClick={() => setMenu((o) => !o)}>⋯</button>
              {menu && (
                <span className="menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setMenu(false); setLook(true); }}>{t("Change the look")}</button>
                  <button type="button" role="menuitem" onClick={() => { setMenu(false); void leave(); }}>{t("Leave this room")}</button>
                </span>
              )}
            </span>
          </div>
        )}
      </section>

      {invited && (
        <section className="bio-card">
          <p className="smallcaps">{t("A room for two")}</p>
          <h2>{t("Move in?")}</h2>
          <p className="muted">{t("You'd both hang films, books and records here, and friends of either of you can visit.")}</p>
          <div className="row">
            <button className="btn" type="button" onClick={() => answer(true)}>{t("Move in")}</button>
            <button className="btn ghost" type="button" onClick={() => answer(false)}>{t("No, thanks")}</button>
          </div>
        </section>
      )}
      {member && room.members.some((m) => m.status === "invited") && (
        <p className="msg" style={{ marginBottom: 12 }}>{t("Waiting for @{name} to move in. You can start hanging things now.", { name: room.members.find((m) => m.status === "invited")!.username })}</p>
      )}
      <p className="msg err" aria-live="polite">{msg}</p>

      <section className="room" style={roomStyle(asRoom(room))} aria-label={room.name}>
        <div className={`wall p-${room.wallpaper}`}>
          {pieces.length === 0 ? (
            <div className="empty-wall">
              <h2>{t("An empty room, for now.")}</h2>
              <p>{member ? t("Hang the film you watched together first, or the record that's always on.") : t("Nothing on the walls yet.")}</p>
              {member && <button className="btn" type="button" onClick={() => setAdding("poster")}>{t("Hang the first thing")}</button>}
            </div>
          ) : (
            <>
              {of("poster").length > 0 && (
                <div className="pieces" aria-label={t("On the wall")}>
                  {of("poster").map((p) => <PieceView key={p.id} piece={p} urls={NO_URLS} onOpen={() => setDetailId(p.id)} />)}
                </div>
              )}
              <div className="furniture">
                {(of("book").length > 0 || member) && (
                  <Bookcase books={of("book")} isOwner={member} onOpen={(p) => setDetailId(p.id)} onAdd={() => setAdding("book")} />
                )}
                {(of("song").length > 0 || member) && (
                  <MusicCorner songs={of("song")} urls={NO_URLS} playingId={playingId} currentId={playingId} isOwner={member}
                    onToggle={toggle} onOpen={(p) => setDetailId(p.id)} onAdd={() => setAdding("song")} note={null} />
                )}
              </div>
            </>
          )}
        </div>
        <div className="floor" aria-hidden="true" />
      </section>

      {adding && <AddSheet kind={adding} roomId={room.id} meId={me.id} position={pieces.length} onClose={() => setAdding(null)} onDone={() => { setAdding(null); void load(); }} />}
      {look && <LookSheet room={room} onClose={() => setLook(false)} onDone={() => { setLook(false); void load(); }} />}
      {wordsFor && (
        <WordsSheet piece={pieces.find((p) => p.id === wordsFor)!} onClose={() => setWordsFor(null)} onDone={() => { setWordsFor(null); void load(); }} />
      )}
      {detail && !wordsFor && (
        <PieceDetail piece={detail} ownerName={detail.added_by_name} urls={NO_URLS} isOwner={member} playing={playingId === detail.id}
          canMoveEarlier={index > 0} canMoveLater={index < pieces.length - 1} onClose={() => setDetailId(null)}
          onPlay={() => { toggle(detail); setDetailId(null); }} onEdit={() => setWordsFor(detail.id)} onMove={move}
          onDelete={async () => { await takeDownTogether(detail.id); setDetailId(null); void load(); }} />
      )}
    </div>
  );
}

const KINDS: { kind: Kind; label: string; search: typeof searchSongs; source: string; placeholder: string }[] = [
  { kind: "poster", label: "Film", search: searchFilms, source: "TMDB", placeholder: "Film or show" },
  { kind: "book", label: "Book", search: searchBooks, source: "Open Library", placeholder: "Title or author" },
  { kind: "song", label: "Record", search: searchSongs, source: "Apple Music", placeholder: "Song or artist" },
];

function AddSheet({ kind: start, roomId, meId, position, onClose, onDone }: {
  kind: Kind; roomId: string; meId: string; position: number; onClose: () => void; onDone: () => void;
}) {
  const t = useT();
  const [kind, setKind] = useState<Kind>(start);
  const [picked, setPicked] = useState<Found | null>(null);
  const [words, setWords] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const meta = KINDS.find((k) => k.kind === kind)!;

  async function hang() {
    if (!picked) return;
    setBusy(true);
    const err = await hangTogether(roomId, meId, {
      type: kind, title: picked.title, subtitle: picked.subtitle, cover_url: picked.cover_url,
      preview_url: kind === "song" ? picked.preview_url ?? null : null, body: words,
    }, position);
    setBusy(false);
    if (err) return setMsg(t(err));
    track("piece_added", { detail: `together:${kind}` });
    onDone();
  }

  return (
    <Sheet onClose={onClose} label={t("Hang something in your room")}>
      <h2>{t("Hang something together")}</h2>
      <div className="typegrid" role="group" aria-label={t("What kind")}>
        {KINDS.map((k) => (
          <button key={k.kind} type="button" aria-pressed={kind === k.kind} onClick={() => { setKind(k.kind); setPicked(null); setMsg(null); }}>{t(k.label)}</button>
        ))}
      </div>
      {picked ? (
        <div className="picked">
          {picked.cover_url && <img src={picked.cover_url} alt="" />}
          <div>
            <b>{picked.title}</b>
            <span className="muted">{picked.subtitle}</span>
            <button className="linkish" type="button" onClick={() => setPicked(null)}>{t("Pick something else")}</button>
          </div>
        </div>
      ) : (
        <SearchPicker key={kind} id="together-search" label={t("Find it")} placeholder={t(meta.placeholder)} source={meta.source}
          search={meta.search} onPick={(f) => { setPicked(f); setMsg(null); }} />
      )}
      <div className="field why">
        <label htmlFor="together-words">{t("In your words")}</label>
        <textarea id="together-words" rows={2} maxLength={500} value={words} placeholder={t("The night we…")} onChange={(e) => setWords(e.target.value)} />
      </div>
      <p className="msg err" aria-live="polite">{msg}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" type="button" disabled={busy || !picked} onClick={hang}>{busy ? t("One moment…") : t("Hang it")}</button>
      </div>
    </Sheet>
  );
}

function WordsSheet({ piece, onClose, onDone }: { piece: Piece; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [words, setWords] = useState(piece.body);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function save() {
    setBusy(true);
    const err = await setTogetherWords(piece.id, words);
    setBusy(false);
    if (err) return setMsg(t(err));
    onDone();
  }
  return (
    <Sheet onClose={onClose} onSubmit={save} label={piece.title}>
      <h2>{piece.title}</h2>
      <div className="field why">
        <label htmlFor="together-edit">{t("In your words")}</label>
        <textarea id="together-edit" rows={3} maxLength={500} value={words} onChange={(e) => setWords(e.target.value)} />
      </div>
      <p className="msg err" aria-live="polite">{msg}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" type="submit" disabled={busy}>{t("Save")}</button>
      </div>
    </Sheet>
  );
}

function LookSheet({ room, onClose, onDone }: { room: TogetherRoom; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [name, setName] = useState(room.name);
  const [theme, setTheme] = useState<ThemeKey>(room.theme);
  const [wallpaper, setWallpaper] = useState<Wallpaper>(room.wallpaper);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function save() {
    setBusy(true);
    const err = await updateTogetherLook(room.id, { name: name.trim() || room.name, theme, wallpaper });
    setBusy(false);
    if (err) return setMsg(t(err));
    onDone();
  }
  return (
    <Sheet onClose={onClose} onSubmit={save} label={t("Change the look")}>
      <h2>{t("Change the look")}</h2>
      <div className="field">
        <label htmlFor="together-name">{t("Room name")}</label>
        <input id="together-name" type="text" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <span className="label">{t("Walls")}</span>
        <ThemeSwatches value={theme} onChange={setTheme} />
      </div>
      <div className="field">
        <span className="label">{t("Wallpaper")}</span>
        <div className="chips">
          {(Object.keys(WALLPAPERS) as Wallpaper[]).map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={wallpaper === k} onClick={() => setWallpaper(k)}>{WALLPAPERS[k]}</button>
          ))}
        </div>
      </div>
      <p className="msg err" aria-live="polite">{msg}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" type="submit" disabled={busy}>{t("Save")}</button>
      </div>
    </Sheet>
  );
}

/** From a friend's room: start a room the two of you share. They're invited and move in from their Library. */
export function StartTogetherSheet({ friendId, friendName, onClose }: { friendId: string; friendName: string; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState(t("Our living room"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function start() {
    setBusy(true);
    const { id, error } = await startTogether(friendId, name.trim() || t("Our living room"));
    setBusy(false);
    if (error || !id) return setMsg(t(error ?? "Couldn't start the room. Try again."));
    track("friend_request", { room: friendId, detail: "together:start" });
    router.push(`/together/${id}`);
  }
  return (
    <Sheet onClose={onClose} onSubmit={start} label={t("Make a room together")}>
      <h2>{t("A room for you and @{name}", { name: friendName })}</h2>
      <p className="muted">{t("One room you both fill: the films you watch together, the records always on, the books you pass back and forth. Friends of either of you can visit. @{name} moves in from their Library.", { name: friendName })}</p>
      <div className="field">
        <label htmlFor="together-new-name">{t("Room name")}</label>
        <input id="together-new-name" type="text" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <p className="msg err" aria-live="polite">{msg}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" type="submit" disabled={busy}>{busy ? t("One moment…") : t("Invite @{name}", { name: friendName })}</button>
      </div>
    </Sheet>
  );
}
