"use client";

import { useEffect, useState } from "react";
import { shareImage, shareLink } from "@/lib/native";
import { drawRoomCard } from "@/lib/room-card";
import type { Piece, Room } from "@/lib/types";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- a local preview of the generated picture */

export function ShareSheet({
  room,
  username,
  pieces,
  urls,
  onClose,
}: {
  room: Room;
  username: string;
  pieces: Piece[];
  urls: Record<string, string>;
  onClose: () => void;
}) {
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const link = `${window.location.origin}/r/${username}`;
  const title = `${room.name} · @${username} on Bottega`;

  useEffect(() => {
    let url: string | null = null;
    let live = true;
    drawRoomCard(room, username, pieces, urls, link)
      .then((blob) => {
        if (!live) return;
        url = URL.createObjectURL(blob);
        setCard({ blob, url });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [room, username, pieces, urls, link]);

  async function sharePicture() {
    if (!card) return;
    const result = await shareImage(card.blob, `bottega-${username}.png`, title, link);
    if (result === "saved") setMsg("Saved the picture. Post it to your story and add the link.");
    else if (result === "failed") setMsg("Couldn't open sharing. Try Copy link instead.");
  }

  async function copyLink() {
    const result = await shareLink(title, link);
    if (result === "copied") setMsg("Link copied.");
    else if (result === "failed") setMsg(`Couldn't share. Your link is ${link}`);
  }

  return (
    <Sheet onClose={onClose} label="Share your room">
      <h2>Share your room</h2>
      <div className="share-preview" aria-live="polite">
        {card ? <img src={card.url} alt={`Picture of ${room.name}`} />
          : failed ? <p className="muted">Couldn&rsquo;t draw the picture. You can still share the link.</p>
          : <p className="muted">Arranging the furniture…</p>}
      </div>
      <p className="hint">Sized for Instagram and TikTok stories. Add your room link as a sticker so friends can step in.</p>
      <p className="msg ok" aria-live="polite">{msg}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={copyLink}>Share link</button>
        <button className="btn" type="button" disabled={!card} onClick={sharePicture}>Share picture</button>
      </div>
    </Sheet>
  );
}
