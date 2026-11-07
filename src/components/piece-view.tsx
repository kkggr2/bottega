"use client";

import { imageOf } from "@/lib/piece-media";
import type { Piece } from "@/lib/types";

/* eslint-disable @next/next/no-img-element -- signed storage URLs expire, so they skip the image optimizer */

/** A piece hung on the wall: a framed poster or a taped-up poem. */
export function PieceView({ piece, urls, onOpen }: { piece: Piece; urls: Record<string, string>; onOpen: () => void }) {
  const img = imageOf(piece, urls);
  // The owner's own words go on the plaque; the catalog line (director, year) lives in the details.
  const words = piece.type === "poem" ? "" : firstLine(piece.body);

  return (
    <div className="piece">
      {piece.type === "poem" ? (
        <button className="obj" type="button" onClick={onOpen} aria-label={`Poem: ${piece.title}`}>
          <div className="paper"><b>{piece.title}</b><p>{piece.body.slice(0, 600)}</p></div>
        </button>
      ) : (
        <button className="obj" type="button" onClick={onOpen} aria-label={`Poster: ${piece.title}`}>
          <div className="frame poster">
            {img ? <img src={img} alt="" /> : (
              <div className="typo-poster"><span>{piece.subtitle || "Now showing"}</span><b>{piece.title}</b></div>
            )}
          </div>
        </button>
      )}
      <button className="plaque" type="button" onClick={onOpen} tabIndex={-1} aria-hidden="true">
        <b>{piece.title}</b>
        {words ? <q>{words}</q> : piece.subtitle ? <span>{piece.subtitle}</span> : null}
      </button>
    </div>
  );
}

/** The first sentence or line of the owner's note, short enough for a plaque. */
function firstLine(body: string): string {
  const text = body.trim().split(/\n/)[0] ?? "";
  const sentence = text.match(/^.*?[.!?…](\s|$)/)?.[0]?.trim() ?? text;
  return sentence.length > 90 ? `${sentence.slice(0, 87).trimEnd()}…` : sentence;
}
