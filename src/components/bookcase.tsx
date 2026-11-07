"use client";

import type { CSSProperties } from "react";
import { imageOf, wobble } from "@/lib/piece-media";
import type { Piece } from "@/lib/types";

/* eslint-disable @next/next/no-img-element -- remote or signed cover art */

const CLOTH = ["#7B2E2E", "#2E4A6B", "#3F5E3A", "#8A6D2F", "#4B3A5E", "#2B2B2B", "#A5532C", "#5E7F86", "#6B4F3A", "#1F3B3A"];

export function Bookcase({
  books,
  isOwner,
  onOpen,
  onAdd,
  chairBook,
  urls = {},
  note,
}: {
  books: Piece[];
  /** The book left open on the armchair, if any. */
  chairBook?: Piece | null;
  urls?: Record<string, string>;
  /** e.g. "On the armchair since Tuesday". */
  note?: string | null;
  isOwner: boolean;
  onOpen: (piece: Piece) => void;
  onAdd: () => void;
}) {
  return (
    <section className="corner bookcase-corner" aria-label="Bookshelf">
      <div className="bookcase">
        <div className="books">
          {books.map((b) => {
            const w = wobble(b.id, 1000);
            return (
              <button
                key={b.id}
                type="button"
                className="book"
                onClick={() => onOpen(b)}
                aria-label={`${b.title}${b.subtitle ? `, ${b.subtitle}` : ""}`}
                title={[b.title, b.subtitle].filter(Boolean).join(" · ")}
                style={{
                  "--cloth": CLOTH[w % CLOTH.length],
                  width: 24 + Math.min(18, Math.round(b.title.length / 2)),
                  "--h": `${100 + (w % 38)}px`,
                } as CSSProperties}
              >
                <span>{b.title}</span>
              </button>
            );
          })}
          {isOwner && (
            <button type="button" className="book add" onClick={onAdd} aria-label="Add a book" title="Add a book">
              <span>+ book</span>
            </button>
          )}
        </div>
      </div>
      {chairBook && (
        <button type="button" className="armchair" onClick={() => onOpen(chairBook)}
          aria-label={`${chairBook.title}, left on the armchair${note ? ` ${note.replace(/^On the armchair /, "")}` : ""}`}
          title={[chairBook.title, note].filter(Boolean).join(" · ")}>
          <span className="back" aria-hidden="true" />
          <span className="arm left" aria-hidden="true" />
          <span className="arm right" aria-hidden="true" />
          <span className="seat" aria-hidden="true" />
          <span className="leg left" aria-hidden="true" />
          <span className="leg right" aria-hidden="true" />
          <span className="chair-book" aria-hidden="true">
            {imageOf(chairBook, urls) ? <img src={imageOf(chairBook, urls)!} alt="" /> : <b>{chairBook.title}</b>}
          </span>
        </button>
      )}
    </section>
  );
}
