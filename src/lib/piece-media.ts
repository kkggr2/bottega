import type { Piece } from "./types";

/** The picture to show for a piece: your own upload first, then the cover found by search. */
export function imageOf(piece: Piece, urls: Record<string, string>): string | null {
  return (piece.image_path && urls[piece.image_path]) || piece.cover_url || null;
}

/** What a record plays: your own clip first, then Apple's preview. */
export function audioOf(piece: Piece, urls: Record<string, string>): string | null {
  return (piece.audio_path && urls[piece.audio_path]) || piece.preview_url || null;
}

/** A stable small number per piece, for varied but repeatable sizes and tilts. */
export function wobble(id: string, range: number): number {
  let n = 0;
  for (const c of id) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return n % range;
}
