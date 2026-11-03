"use client";

import type { CSSProperties } from "react";
import { wobble } from "@/lib/piece-media";
import type { Piece } from "@/lib/types";

const CLOTH = ["#7B2E2E", "#2E4A6B", "#3F5E3A", "#8A6D2F", "#4B3A5E", "#2B2B2B", "#A5532C", "#5E7F86", "#6B4F3A", "#1F3B3A"];

export function Bookcase({
  books,
  isOwner,
  onOpen,
  onAdd,
}: {
  books: Piece[];
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
      <p className="corner-label mono">{books.length ? `${books.length} ${books.length === 1 ? "book" : "books"}` : "Bookshelf"}</p>
    </section>
  );
}
