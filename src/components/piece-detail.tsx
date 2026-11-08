"use client";

import { useEffect, useState } from "react";
import { loadReactions, setReaction } from "@/lib/wall";
import { hostOf, toEmbed } from "@/lib/embeds";
import { formatTime } from "@/lib/lookup";
import { audioOf, imageOf } from "@/lib/piece-media";
import type { Piece } from "@/lib/types";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- signed storage URLs expire, so they skip the image optimizer */

export function PieceDetail({
  piece,
  ownerName,
  urls,
  isOwner,
  playing,
  canMoveEarlier,
  canMoveLater,
  onClose,
  onPlay,
  onEdit,
  onMove,
  onDelete,
  now,
  meId,
}: {
  piece: Piece;
  /** Whose room this is, to sign their words. */
  ownerName?: string;
  urls: Record<string, string>;
  isOwner: boolean;
  playing: boolean;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  onClose: () => void;
  onPlay: () => void;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => Promise<void>;
  /** For the owner: leave this out on the turntable, in the TV or on the armchair. */
  now?: { on: boolean; put: string; take: string; set: (on: boolean) => Promise<void> };
  /** Signed-in viewer, for reactions. Left out in the example room. */
  meId?: string | null;
}) {
  const [armed, setArmed] = useState(false);
  // "This one got me": visitors can react; only the owner sees who did.
  const [reactions, setReactions] = useState<{ user_id: string; username?: string }[] | null>(null);
  useEffect(() => {
    if (!meId) return;
    let live = true;
    loadReactions(piece.id).then((r) => live && setReactions(r));
    return () => { live = false; };
  }, [piece.id, meId]);
  const mine = Boolean(meId && reactions?.some((r) => r.user_id === meId));
  async function toggleReaction() {
    if (!meId) return;
    const next = !mine;
    setReactions((r) => next ? [...(r ?? []), { user_id: meId }] : (r ?? []).filter((x) => x.user_id !== meId));
    const err = await setReaction(piece.id, meId, next);
    if (err) setReactions(await loadReactions(piece.id));
  }
  const [busy, setBusy] = useState(false);
  const img = imageOf(piece, urls);
  const songAudio = piece.type === "song" ? audioOf(piece, urls) : null;
  const embed = piece.type === "song" ? toEmbed(piece.link) : null;
  const sceneTimes = piece.type === "scene" && piece.clip_start != null
    ? `${formatTime(piece.clip_start)}${piece.clip_end != null ? ` to ${formatTime(piece.clip_end)}` : " onward"}`
    : null;

  return (
    <Sheet onClose={onClose} label={piece.title}>
      <div>
        <h2>{piece.title}</h2>
        {piece.subtitle && <p className="who">{piece.subtitle}</p>}
      </div>
      {/* The owner's words come first: they're why this piece is here. */}
      {piece.body && piece.type !== "poem" && (
        <blockquote className="detail-why">
          <p>{piece.body}</p>
          {ownerName && <footer>@{ownerName}</footer>}
        </blockquote>
      )}
      {piece.body && piece.type === "poem" && <div className="detail-text poem">{piece.body}</div>}
      {img && (
        <div className={`detail-media${piece.type === "book" || piece.type === "song" ? " cover" : ""}${piece.body ? " small" : ""}`}>
          <img src={img} alt={piece.title} onError={(e) => { e.currentTarget.parentElement!.hidden = true; }} />
        </div>
      )}
      {img?.startsWith("https://image.tmdb.org/") && <p className="credit">Image from TMDB</p>}
      {meId && !isOwner && reactions !== null && (
        <button type="button" className={`react${mine ? " on" : ""}`} aria-pressed={mine} onClick={toggleReaction}>
          <span aria-hidden="true">✦</span> {mine ? "This one got you" : "This one got me"}
        </button>
      )}
      {isOwner && reactions && reactions.length > 0 && (
        <p className="reacted"><span aria-hidden="true">✦</span> Got {joinNames(reactions.map((r) => `@${r.username}`))}</p>
      )}
      {songAudio && (
        <div>
          <button className="btn" type="button" onClick={onPlay}>{playing ? "Pause" : "Play on the turntable"}</button>
          {piece.preview_url && !piece.audio_path && <span className="hint"> 30-second preview from Apple Music</span>}
        </div>
      )}
      {piece.type === "scene" && piece.link && (
        <div>
          <button className="btn" type="button" onClick={onPlay}>Play on the TV</button>
          {sceneTimes && <span className="hint"> {sceneTimes}</span>}
        </div>
      )}
      {embed && (
        <iframe
          className={`embed${embed.height ? "" : " video"}`}
          src={embed.src}
          height={embed.height || undefined}
          title={`${embed.provider} player`}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}
      {piece.link && (
        <p>
          <a href={piece.link} target="_blank" rel="noopener noreferrer">Open link ↗</a>{" "}
          <span className="muted">{hostOf(piece.link)}</span>
        </p>
      )}
      {now && (
        <div className="now-toggle">
          <button className={`btn ${now.on ? "ghost" : ""}`} type="button" disabled={busy}
            onClick={async () => { setBusy(true); await now.set(!now.on); setBusy(false); }}>
            {now.on ? now.take : now.put}
          </button>
          {!now.on && <span className="hint">Friends see it when they come in.</span>}
        </div>
      )}
      {isOwner ? (
        <div className="row split">
          <div className="row">
            <button className="btn danger" type="button" disabled={busy}
              onClick={async () => {
                if (!armed) return setArmed(true);
                setBusy(true);
                await onDelete();
              }}>
              {armed ? "Click again to remove" : "Remove"}
            </button>
            <button className="btn ghost" type="button" disabled={!canMoveEarlier} onClick={() => onMove(-1)}>← Earlier</button>
            <button className="btn ghost" type="button" disabled={!canMoveLater} onClick={() => onMove(1)}>Later →</button>
          </div>
          <div className="row">
            <button className="btn ghost" type="button" onClick={onEdit}>Edit</button>
            <button className="btn" type="button" onClick={onClose}>Close</button>
          </div>
        </div>
      ) : (
        <div className="row"><button className="btn" type="button" onClick={onClose}>Close</button></div>
      )}
    </Sheet>
  );
}

function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
