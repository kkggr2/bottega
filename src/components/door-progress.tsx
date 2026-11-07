"use client";

import type { Piece, PieceType } from "@/lib/types";

/*
 * For a new room: five things open the door. Shows how far along you are and the one thing to add next.
 * Music comes first, because it's what strangers talk about first when getting to know each other.
 */

export const DOOR_AT = 5;

const NEXT: { type: PieceType; line: string; button: string }[] = [
  { type: "song", line: "Start with a song: the one you'd play for a friend.", button: "Add a song" },
  { type: "poster", line: "Hang a film that stayed with you.", button: "Hang a film" },
  { type: "book", line: "Shelve a book you'd lend someone.", button: "Add a book" },
  { type: "scene", line: "Add a scene you always rewind.", button: "Add a scene" },
];

export function DoorProgress({ pieces, onAdd, onImport }: {
  pieces: Piece[];
  onAdd: (type?: PieceType) => void;
  onImport: () => void;
}) {
  const count = Math.min(pieces.length, DOOR_AT);
  const has = new Set(pieces.map((p) => p.type));
  const next = NEXT.find((n) => !has.has(n.type));
  const left = DOOR_AT - count;

  return (
    <section className="door-progress" aria-label="Opening your door">
      <div className="dp-top">
        <div className="dp-dots" role="img" aria-label={`${count} of ${DOOR_AT} things in your room`}>
          {Array.from({ length: DOOR_AT }, (_, i) => <span key={i} className={i < count ? "on" : ""} />)}
        </div>
        <p className="dp-count">
          <b>{count} of {DOOR_AT}</b> · {left === 1 ? "one more opens your door" : `your door opens at ${DOOR_AT}`}
        </p>
      </div>
      <p className="dp-next">{next ? next.line : "Add anything you love."}</p>
      <div className="row">
        <button className="btn" type="button" onClick={() => onAdd(next?.type)}>{next ? next.button : "Add something"}</button>
        <button className="linkish" type="button" onClick={onImport}>Or bring in your Letterboxd films or Goodreads books</button>
      </div>
    </section>
  );
}

export function DoorOpen({ onShare, onClose }: { onShare: () => void; onClose: () => void }) {
  return (
    <section className="door-open" role="status">
      <div>
        <h2>Your door is open.</h2>
        <p>Five things are in. Send the link so friends can step inside.</p>
      </div>
      <div className="row">
        <button className="btn" type="button" onClick={onShare}>Share my room</button>
        <button className="btn ghost" type="button" onClick={onClose}>Later</button>
      </div>
    </section>
  );
}
