import type { Piece, PieceType } from "./types";

/*
 * Taste Match: how alike two rooms are. Worked out on the phone from the two rooms' pieces, nothing stored.
 * A piece counts by the work itself (the same film, book or record), by its maker (the same director,
 * author or artist), and lightly by kind (both of you hang mostly films). Shared works weigh most.
 */

export type MatchItem = Pick<Piece, "id" | "type" | "title" | "subtitle" | "cover_url">;

export type TasteMatch = {
  percent: number;
  /** Works in both rooms. */
  both: MatchItem[];
  /** Makers in both rooms, by name, when the works themselves differ. */
  makers: string[];
  /** One thing from their room you don't have, and why it might be yours. */
  tryThis: { piece: MatchItem; because: { kind: "maker"; name: string } | { kind: "type"; type: Kind } } | null;
  /** The kind of thing each of you hangs most. */
  mostly: { me: Kind | null; them: Kind | null };
};

export type Kind = "film" | "book" | "music" | "poem" | "game";
export const MIN_PIECES = 3;

const kindOf = (t: PieceType): Kind => (t === "poster" || t === "scene" ? "film" : t === "song" ? "music" : t);

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i")
    .replace(/\(.*?\)|\[.*?\]/g, "").replace(/^(the|a|an)\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();

const workKey = (p: Pick<Piece, "type" | "title">) => `${kindOf(p.type)}:${norm(p.title)}`;

/** "Wong Kar-wai · 2000" → "Wong Kar-wai". Poems written for the room have no maker. */
function makerOf(p: Pick<Piece, "type" | "subtitle">): string | null {
  const first = p.subtitle.split(" · ")[0]?.split(",")[0]?.trim() ?? "";
  if (!first || /^\d{4}$/.test(first) || /written for this room/i.test(first)) return null;
  return first;
}

function vector(pieces: MatchItem[]) {
  const v = new Map<string, number>();
  const add = (k: string, w: number) => v.set(k, (v.get(k) ?? 0) + w);
  for (const p of pieces) {
    add(`w:${workKey(p)}`, 3);
    const m = makerOf(p);
    if (m) add(`m:${norm(m)}`, 2.5);
  }
  // How much of the room is each kind, so two film people aren't strangers.
  const kinds = new Map<Kind, number>();
  for (const p of pieces) kinds.set(kindOf(p.type), (kinds.get(kindOf(p.type)) ?? 0) + 1);
  for (const [k, n] of kinds) add(`k:${k}`, (n / pieces.length) * 5);
  return { v, kinds };
}

function cosine(a: Map<string, number>, b: Map<string, number>) {
  let dot = 0, na = 0, nb = 0;
  for (const [k, x] of a) { na += x * x; const y = b.get(k); if (y) dot += x * y; }
  for (const y of b.values()) nb += y * y;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

const top = (kinds: Map<Kind, number>): Kind | null => [...kinds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

/** Null when either room has fewer than MIN_PIECES pieces: too little to say. */
export function tasteMatch(mine: MatchItem[], theirs: MatchItem[]): TasteMatch | null {
  if (mine.length < MIN_PIECES || theirs.length < MIN_PIECES) return null;
  const a = vector(mine), b = vector(theirs);
  // Spread the raw similarity so it reads like people expect: strangers in the 20s, kindred spirits in the 80s and 90s.
  const raw = cosine(a.v, b.v);
  const percent = Math.max(1, Math.min(99, Math.round(100 * Math.pow(raw, 0.35))));

  const myWorks = new Set(mine.map(workKey));
  const both = theirs.filter((p) => myWorks.has(workKey(p)));
  const bothKeys = new Set(both.map(workKey));

  const myMakers = new Map(mine.map((p) => [norm(makerOf(p) ?? ""), makerOf(p)] as const).filter(([k]) => k));
  const makers = [...new Set(theirs
    .filter((p) => !bothKeys.has(workKey(p)))
    .map((p) => makerOf(p))
    .filter((m): m is string => Boolean(m && myMakers.has(norm(m)))))];

  // Something of theirs you don't have: first by a maker you share, else of the kind you hang most.
  const notMine = theirs.filter((p) => !myWorks.has(workKey(p)) && p.type !== "poem");
  const myTop = top(a.kinds);
  const byMaker = notMine.find((p) => { const m = makerOf(p); return m && myMakers.has(norm(m)); });
  const byKind = myTop ? notMine.find((p) => kindOf(p.type) === myTop) : undefined;
  const tryThis = byMaker
    ? { piece: byMaker, because: { kind: "maker" as const, name: makerOf(byMaker)! } }
    : byKind && myTop ? { piece: byKind, because: { kind: "type" as const, type: myTop } } : null;

  return { percent, both: both.slice(0, 6), makers: makers.slice(0, 4), tryThis, mostly: { me: myTop, them: top(b.kinds) } };
}
