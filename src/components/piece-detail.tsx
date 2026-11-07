"use client";

import { useState } from "react";
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
}) {
  const [armed, setArmed] = useState(false);
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
