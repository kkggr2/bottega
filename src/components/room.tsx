"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { befriend, friendshipWith, relationOf, unfriend, type Relation } from "@/lib/friends";
import { removeMedia, signedUrls } from "@/lib/media";
import { shareLink, tap } from "@/lib/native";
import { audioOf } from "@/lib/piece-media";
import { friendlyError, supabase } from "@/lib/supabase";
import { rememberCameFrom, track } from "@/lib/track";
import { MAX_PIECES, PIECE_TYPES, roomStyle } from "@/lib/themes";
import type { Piece, PieceType, Profile, Room } from "@/lib/types";
import { Bookcase } from "./bookcase";
import { useAuth } from "./auth";
import { Customize } from "./customize";
import { Gate } from "./gate";
import { ImportSheet } from "./import-sheet";
import { MusicCorner } from "./music-corner";
import { PieceDetail } from "./piece-detail";
import { PieceEditor } from "./piece-editor";
import { PieceView } from "./piece-view";
import { ScreenCorner } from "./screen-corner";
import { ShareSheet } from "./share-sheet";

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "hidden" }
  | { state: "ready"; owner: Profile; room: Room; canView: boolean; pieces: Piece[]; relation: Relation };

type Editing = { piece: Piece | null; type?: PieceType };

export function RoomScreen({ username }: { username: string }) {
  const auth = useAuth();
  const name = decodeURIComponent(username).toLowerCase();
  // Visitors without an account can step into public rooms.
  if (auth.status === "signedOut") return <RoomInner username={name} me={null} />;
  return <Gate>{(me) => <RoomInner username={name} me={me} />}</Gate>;
}

function RoomInner({ username, me }: { username: string; me: Profile | null }) {
  const [data, setData] = useState<Loaded>({ state: "loading" });
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // The turntable and the TV.
  const [recordId, setRecordId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [tvId, setTvId] = useState<string | null>(null);
  const [tvOn, setTvOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const viewed = useRef(false);
  const meId = me?.id ?? null;

  const load = useCallback(async () => {
    const sb = supabase();
    const { data: owner } = await sb.from("profiles").select("id, username").eq("username", username).maybeSingle();
    // Signed out, only owners of public rooms are visible.
    if (!owner) return setData({ state: meId ? "missing" : "hidden" });
    const [{ data: room }, { data: canView }, friendship] = await Promise.all([
      sb.from("rooms").select("owner_id, name, tagline, theme, wallpaper, visibility").eq("owner_id", owner.id).maybeSingle(),
      sb.rpc("can_view_room", { owner: owner.id }),
      !meId || owner.id === meId ? Promise.resolve(null) : friendshipWith(meId, owner.id),
    ]);
    if (!room) return setData({ state: meId ? "missing" : "hidden" });
    let pieces: Piece[] = [];
    if (canView) {
      const { data: rows } = await sb.from("pieces").select("*").eq("owner_id", owner.id).order("position");
      pieces = (rows as Piece[]) ?? [];
      const paths = pieces.flatMap((p) => [p.image_path, p.audio_path]).filter((p): p is string => Boolean(p));
      if (paths.length) setUrls(await signedUrls(paths));
    }
    setData({
      state: "ready",
      owner: owner as Profile,
      room: room as Room,
      canView: Boolean(canView),
      pieces,
      relation: meId ? relationOf(friendship, meId) : "none",
    });
    if (!viewed.current) {
      viewed.current = true;
      const relation = meId ? relationOf(friendship, meId) : "none";
      const as = owner.id === meId ? "owner" : !meId ? "signed_out" : relation === "friends" ? "friend" : "member";
      track("room_view", { room: owner.id, detail: as });
      if (!meId) rememberCameFrom({ id: owner.id, username: owner.username });
    }
  }, [username, meId]);

  const ownerId = data.state === "ready" ? data.owner.id : null;

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on mount
  }, [load]);

  // Live updates while you're in the room.
  useEffect(() => {
    if (!ownerId) return;
    const sb = supabase();
    const channel = sb
      .channel(`room-${ownerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pieces", filter: `owner_id=eq.${ownerId}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `owner_id=eq.${ownerId}` }, () => load())
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [ownerId, load]);

  useEffect(() => () => audioRef.current?.pause(), []);

  const stopMusic = useCallback(() => {
    audioRef.current?.pause();
    setPlayingId(null);
  }, []);

  const toggleRecord = useCallback(
    (piece: Piece) => {
      const src = audioOf(piece, urls);
      if (!src) {
        setDetailId(piece.id);
        return;
      }
      if (playingId === piece.id) return stopMusic();
      audioRef.current?.pause();
      setRecordId(piece.id);
      setTvOn(false); // one sound at a time
      const audio = new Audio(src);
      audio.onended = () => setPlayingId(null);
      audioRef.current = audio;
      tap();
      audio.play().then(
        () => setPlayingId(piece.id),
        () => setNotice("This record can't play right now."),
      );
    },
    [playingId, urls, stopMusic],
  );

  const insertDvd = useCallback(
    (piece: Piece) => {
      stopMusic();
      setTvId(piece.id);
      setTvOn(Boolean(piece.link));
      tap();
    },
    [stopMusic],
  );

  if (data.state === "loading") return <p className="loading">Turning on the lights…</p>;
  if (data.state === "hidden") {
    return (
      <div className="empty-wall">
        <h2>@{username}&rsquo;s room is for friends.</h2>
        <p>Log in to step inside, or make a room of your own.</p>
        <p style={{ marginTop: 16 }}><Link className="btn" href="/">Make my own room</Link></p>
      </div>
    );
  }
  if (data.state === "missing") {
    return (
      <div className="empty-wall">
        <h2>No room called @{username}.</h2>
        <Link className="btn ghost" href="/">Back to the library</Link>
      </div>
    );
  }

  const { owner, room, canView, pieces, relation } = data;
  const isOwner = owner.id === meId;
  const zoneOf = (p: Piece) => PIECE_TYPES[p.type]?.zone ?? "wall";
  const wall = pieces.filter((p) => zoneOf(p) === "wall");
  const books = pieces.filter((p) => p.type === "book");
  const songs = pieces.filter((p) => p.type === "song");
  const scenes = pieces.filter((p) => p.type === "scene");
  const games = pieces.filter((p) => p.type === "game");
  const full = pieces.length >= MAX_PIECES;

  const detail = pieces.find((p) => p.id === detailId) ?? null;
  // Earlier/later moves a piece among its own kind, which is what you see side by side.
  const siblings = detail ? pieces.filter((p) => p.type === detail.type) : [];
  const detailIndex = detail ? siblings.indexOf(detail) : -1;

  const add = (type?: PieceType) => (full ? setNotice(`A room holds ${MAX_PIECES} pieces. Remove one to make space.`) : setEditing({ piece: null, type }));

  async function friendAction() {
    if (!me) return;
    try {
      if (relation === "none" || relation === "incoming") {
        const next = await befriend(me.id, owner.id);
        track("friend_request", { room: owner.id, detail: next });
        setNotice(next === "friends" ? `You and @${owner.username} are friends now.` : `Request sent to @${owner.username}.`);
      } else {
        await unfriend(me.id, owner.id);
        setNotice(relation === "outgoing" ? "Request cancelled." : `Removed @${owner.username} from your shelf.`);
      }
      await load();
    } catch (error) {
      setNotice(friendlyError(error, "Couldn't update your friends. Try again."));
    }
  }

  async function move(dir: -1 | 1) {
    const a = siblings[detailIndex];
    const b = siblings[detailIndex + dir];
    if (!a || !b) return;
    const sb = supabase();
    // Give the pair distinct positions even if they were created in the same instant.
    const [pa, pb] = a.position === b.position ? [b.position + dir, a.position] : [b.position, a.position];
    await sb.from("pieces").update({ position: pa }).eq("id", a.id);
    await sb.from("pieces").update({ position: pb }).eq("id", b.id);
    await load();
  }

  async function remove(piece: Piece) {
    const { error } = await supabase().from("pieces").delete().eq("id", piece.id);
    if (error) return setNotice(friendlyError(error, "Couldn't remove it. Try again."));
    await removeMedia([piece.image_path, piece.audio_path]).catch(() => {});
    if (recordId === piece.id) { stopMusic(); setRecordId(null); }
    if (tvId === piece.id) { setTvOn(false); setTvId(null); }
    setDetailId(null);
    await load();
  }

  async function share() {
    const url = `${window.location.origin}/r/${owner.username}`;
    const result = await shareLink(`${room.name} · @${owner.username} on Bottega`, url);
    if (result === "shared" || result === "copied") track("share_link", { room: owner.id, detail: "visitor" });
    if (result === "copied") setNotice("Link copied. Paste it to a friend.");
    else if (result === "failed") setNotice(`Couldn't share. The link is ${url}`);
  }

  const friendLabel = {
    none: `Add @${owner.username}`,
    incoming: `Accept @${owner.username}'s request`,
    outgoing: "Cancel request",
    friends: "Remove from my shelf",
  }[relation];

  const showBooks = isOwner || books.length > 0;
  const showScreen = isOwner || scenes.length > 0 || games.length > 0;
  const showMusic = isOwner || songs.length > 0;

  return (
    <div>
      <section className="door">
        <div>
          <Link className="back mono" href="/">{me ? "← Library" : "← Bottega"}</Link>
          <p className="mono muted">@{owner.username}{isOwner ? " · your room" : ""}</p>
          <h1>{room.name}</h1>
          {room.tagline && <p className="tag">{room.tagline}</p>}
        </div>
        <div className="actions">
          {isOwner ? (
            <>
              <button className="btn ghost" type="button" onClick={() => setSharing(true)}>Share</button>
              <button className="btn ghost" type="button" onClick={() => setCustomizing(true)}>Customize room</button>
              <button className="btn ghost" type="button" onClick={() => setImporting(true)}>Import</button>
              <button className="btn" type="button" onClick={() => add()}>Add something</button>
            </>
          ) : me ? (
            <>
              <button className="btn ghost" type="button" onClick={share}>Share</button>
              <button className={`btn ${relation === "none" || relation === "incoming" ? "" : "ghost"}`} type="button" onClick={friendAction}>
                {friendLabel}
              </button>
            </>
          ) : (
            <>
              <button className="btn ghost" type="button" onClick={share}>Share</button>
              <Link className="btn" href="/" onClick={() => track("make_yours", { room: owner.id, detail: "top" })}>Make my own room</Link>
            </>
          )}
        </div>
      </section>
      {notice && <p className="msg ok" role="status" style={{ marginBottom: 12 }}>{notice}</p>}

      <section className="room" style={roomStyle(room)} aria-label={`${room.name}, @${owner.username}'s room`}>
        <div className={`wall p-${room.wallpaper}`}>
          {!canView ? (
            <div className="empty-wall">
              <h2>The door is closed.</h2>
              <p>
                {room.visibility === "private"
                  ? `@${owner.username} keeps this room to themselves for now.`
                  : `Only @${owner.username}'s friends can step inside.`}
              </p>
            </div>
          ) : !isOwner && pieces.length === 0 ? (
            <div className="empty-wall">
              <h2>Nothing in here yet.</h2>
              <p>Check back soon.</p>
            </div>
          ) : (
            <>
              {wall.length > 0 ? (
                <div className="pieces" aria-label="On the wall">
                  {wall.map((p) => <PieceView key={p.id} piece={p} urls={urls} onOpen={() => setDetailId(p.id)} />)}
                  {isOwner && (
                    <div className="piece">
                      <button type="button" className="hang" onClick={() => add("poster")}>+ Hang something</button>
                    </div>
                  )}
                </div>
              ) : isOwner ? (
                <div className="pieces">
                  <div className="piece">
                    <button type="button" className="hang" onClick={() => add("poster")}>+ Hang a poster or a poem</button>
                  </div>
                  {pieces.length === 0 && (
                    <div className="piece">
                      <button type="button" className="hang" onClick={() => setImporting(true)}>Fill it fast: bring in your Letterboxd films or Goodreads books</button>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="furniture">
                {showBooks && (
                  <Bookcase books={books} isOwner={isOwner} onOpen={(p) => setDetailId(p.id)} onAdd={() => add("book")} />
                )}
                {showScreen && (
                  <ScreenCorner
                    scenes={scenes}
                    games={games}
                    urls={urls}
                    tvId={tvId}
                    tvOn={tvOn}
                    isOwner={isOwner}
                    onInsert={insertDvd}
                    onPower={() => { if (!tvOn) stopMusic(); setTvOn(!tvOn); }}
                    onOpen={(p) => setDetailId(p.id)}
                    onAddScene={() => add("scene")}
                    onAddGame={() => add("game")}
                  />
                )}
                {showMusic && (
                  <MusicCorner
                    songs={songs}
                    urls={urls}
                    playingId={playingId}
                    currentId={recordId}
                    isOwner={isOwner}
                    onToggle={toggleRecord}
                    onOpen={(p) => setDetailId(p.id)}
                    onAdd={() => add("song")}
                  />
                )}
              </div>
            </>
          )}
        </div>
        <div className="floor" aria-hidden="true" />
      </section>

      {!me && (
        <section className="make-yours">
          <div>
            <p className="mono muted">Everyone gets one room</p>
            <h2>Make yours. It takes about three minutes.</h2>
            <p className="muted">Hang what you love, then send @{owner.username} a friend request so your rooms sit side by side.</p>
          </div>
          <Link className="btn" href="/" onClick={() => track("make_yours", { room: owner.id, detail: "bottom" })}>Make my own room</Link>
        </section>
      )}

      {detail && (
        <PieceDetail
          piece={detail}
          urls={urls}
          isOwner={isOwner}
          playing={playingId === detail.id}
          canMoveEarlier={detailIndex > 0}
          canMoveLater={detailIndex < siblings.length - 1}
          onClose={() => setDetailId(null)}
          onPlay={() => {
            if (detail.type === "scene") insertDvd(detail);
            else toggleRecord(detail);
            setDetailId(null);
          }}
          onEdit={() => { setEditing({ piece: detail }); setDetailId(null); }}
          onMove={move}
          onDelete={() => remove(detail)}
        />
      )}
      {editing && (
        <PieceEditor
          ownerId={owner.id}
          existing={editing.piece}
          initialType={editing.type}
          existingImageUrl={editing.piece?.image_path ? urls[editing.piece.image_path] : undefined}
          onClose={() => { setEditing(null); load(); }}
        />
      )}
      {customizing && <Customize room={room} onClose={() => { setCustomizing(false); load(); }} />}
      {importing && <ImportSheet ownerId={owner.id} pieces={pieces} onClose={() => { setImporting(false); load(); }} />}
      {sharing && <ShareSheet room={room} username={owner.username} pieces={pieces} urls={urls} onClose={() => setSharing(false)} onChanged={load} />}
    </div>
  );
}
