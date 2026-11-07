"use client";

import { useEffect, useState } from "react";
import { shareImage, shareLink } from "@/lib/native";
import { drawRoomCard } from "@/lib/room-card";
import { friendlyError, supabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import type { Piece, Room } from "@/lib/types";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- a local preview of the generated picture */

export function ShareSheet({
  room,
  username,
  pieces,
  urls,
  onClose,
  onChanged,
}: {
  room: Room;
  username: string;
  pieces: Piece[];
  urls: Record<string, string>;
  onClose: () => void;
  /** Called after the room is opened to everyone, so the page can reload it. */
  onChanged?: () => void;
}) {
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const isExample = room.owner_id === "example";
  const friendsOnly = !isExample && room.visibility !== "public";
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
    if (result === "shared" || result === "saved") track("share_picture", { room: room.owner_id, detail: result });
    if (result === "saved") setMsg("Saved the picture. Post it to your story and add the link.");
    else if (result === "failed") setMsg("Couldn't open sharing. Try Copy link instead.");
  }

  async function copyLink() {
    const result = await shareLink(title, link);
    if (result === "shared" || result === "copied") track("share_link", { room: room.owner_id, detail: result });
    if (result === "copied") setMsg("Link copied.");
    else if (result === "failed") setMsg(`Couldn't share. Your link is ${link}`);
  }

  async function openToEveryone() {
    setOpening(true);
    const { error } = await supabase().from("rooms").update({ visibility: "public" }).eq("owner_id", room.owner_id);
    setOpening(false);
    if (error) return setMsg(friendlyError(error, "Couldn't change who can see your room."));
    track("made_public", { room: room.owner_id });
    setMsg("Done. Anyone with the link can look around now.");
    onChanged?.();
  }

  return (
    <Sheet onClose={onClose} label="Share your room">
      <h2>Share your room</h2>
      <div className="share-preview" aria-live="polite">
        {card ? <img src={card.url} alt={`Picture of ${room.name}`} />
          : failed ? <p className="muted">Couldn&rsquo;t draw the picture. You can still share the link.</p>
          : <p className="muted">Arranging the furniture…</p>}
      </div>
      {friendsOnly && (
        <div className="callout">
          <p>
            <b>Only your friends can open this link.</b> Anyone else sees a closed door.
            Open it to everyone so people can look around, and make a room of their own.
          </p>
          <button className="btn ghost" type="button" disabled={opening} onClick={openToEveryone}>
            {opening ? "Opening…" : "Let anyone with the link look in"}
          </button>
        </div>
      )}
      <p className="hint">Sized for Instagram and TikTok stories. Add your room link as a sticker so friends can step in.</p>
      <p className="msg ok" aria-live="polite">{msg}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={copyLink}>Share link</button>
        <button className="btn" type="button" disabled={!card} onClick={sharePicture}>Share picture</button>
      </div>
    </Sheet>
  );
}
