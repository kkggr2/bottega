import { supabase } from "./supabase";
import { tasteMatch, type Kind, type MatchItem } from "./taste";
import type { PieceType } from "./types";

/*
 * Your Year in the Room. Pieces and friends are read here; visits, notes, quizzes and clubs come from
 * my_year() (supabase/migrations/20261122000000_year.sql).
 */

export type YearPiece = MatchItem & { created_at: string };

export type YearServer = {
  visits: number; visitors: number; notes: number; recs: number; friends: number; new_friends: number; now_sets: number;
  quizzes: number; quiz_correct: number; quiz_best: number; quiz_best_id: string | null; club_quizzes: number;
  clubs: { name: string; emoji: string }[];
};

export type Persona = { id: string; name: string; line: string };

export type Year = {
  year: number;
  /** Everything in the room now, and what went up this year. */
  all: YearPiece[];
  added: YearPiece[];
  kinds: { kind: Kind; share: number }[];
  persona: Persona;
  decade: number | null;
  person: { name: string; count: number } | null;
  twin: { username: string; percent: number } | null;
  quizTitle: string | null;
  server: YearServer;
};

const kindOf = (t: PieceType): Kind => (t === "poster" || t === "scene" ? "film" : t === "song" ? "music" : t);
const yearOf = (subtitle: string) => Number(subtitle.match(/\b(18|19|20)\d{2}\b/)?.[0] ?? NaN);
const makerOf = (subtitle: string) => {
  const m = subtitle.split(" · ")[0]?.split(",")[0]?.trim() ?? "";
  return !m || /^\d{4}$/.test(m) || /written for this room/i.test(m) ? null : m;
};

/** A name for how someone's room leans. English here; the screen translates it. */
export function personaFor(pieces: YearPiece[]): Persona {
  const counts = new Map<Kind, number>();
  for (const p of pieces) counts.set(kindOf(p.type), (counts.get(kindOf(p.type)) ?? 0) + 1);
  const [lead, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["film", 0];
  const years = pieces.map((p) => yearOf(p.subtitle)).filter((y) => !Number.isNaN(y)).sort((a, b) => a - b);
  const median = years.length ? years[Math.floor(years.length / 2)] : null;
  const old = median !== null && median < 1990, recent = median !== null && median >= 2015;
  if (!pieces.length || n / pieces.length < 0.5) {
    return { id: "polymath", name: "The Polymath", line: "Films, books and records all get a place on your walls. Your taste refuses to pick one door." };
  }
  if (lead === "film") {
    if (old) return { id: "revival", name: "The Revival-House Regular", line: "You'd rather see a 35mm print of something old than anything opening this week." };
    if (recent) return { id: "opening", name: "The Opening-Night Regular", line: "You see it first, and you have opinions by the time the credits roll." };
    return { id: "cinephile", name: "The Late-Night Cinephile", line: "One more film before bed. Then one more." };
  }
  if (lead === "book") {
    if (old) return { id: "oldsoul", name: "The Old Soul", line: "Your shelf reads like a library that's been loved for a hundred years." };
    return { id: "nightreader", name: "The Night Reader", line: "Lamp on, phone face down, one more chapter." };
  }
  if (lead === "music") {
    if (old) return { id: "crate", name: "The Crate Digger", line: "You found the record before it was a reissue." };
    return { id: "headphones", name: "The Headphones Poet", line: "Every walk has a soundtrack, and you chose it carefully." };
  }
  return { id: "collector", name: "The Collector", line: "Your room is a cabinet of small wonders." };
}

export async function loadYear(meId: string, year = new Date().getFullYear()): Promise<Year> {
  const sb = supabase();
  const [{ data: rows }, { data: server }, { data: fr }] = await Promise.all([
    sb.from("pieces").select("id, type, title, subtitle, cover_url, created_at").eq("owner_id", meId).order("created_at"),
    sb.rpc("my_year", { p_year: year }),
    sb.from("friendships").select("requester, addressee").eq("status", "accepted"),
  ]);
  const all = (rows ?? []) as YearPiece[];
  const added = all.filter((p) => new Date(p.created_at).getFullYear() === year);
  const pool = added.length >= 3 ? added : all;

  const counts = new Map<Kind, number>();
  for (const p of pool) counts.set(kindOf(p.type), (counts.get(kindOf(p.type)) ?? 0) + 1);
  const kinds = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([kind, c]) => ({ kind, share: c / Math.max(1, pool.length) }));

  const decades = new Map<number, number>();
  for (const p of pool) { const y = yearOf(p.subtitle); if (!Number.isNaN(y)) decades.set(Math.floor(y / 10) * 10, (decades.get(Math.floor(y / 10) * 10) ?? 0) + 1); }
  const decade = [...decades.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const makers = new Map<string, number>();
  for (const p of all) { const m = makerOf(p.subtitle); if (m) makers.set(m, (makers.get(m) ?? 0) + 1); }
  const top = [...makers.entries()].sort((a, b) => b[1] - a[1])[0];
  const person = top && top[1] >= 2 ? { name: top[0], count: top[1] } : null;

  // Your taste twin among friends: the friend whose room is most like yours.
  let twin: Year["twin"] = null;
  const friendIds = ((fr ?? []) as { requester: string; addressee: string }[]).map((f) => (f.requester === meId ? f.addressee : f.requester));
  if (friendIds.length && all.length >= 3) {
    const [{ data: theirPieces }, { data: names }] = await Promise.all([
      sb.from("pieces").select("id, owner_id, type, title, subtitle, cover_url").in("owner_id", friendIds),
      sb.from("profiles").select("id, username").in("id", friendIds),
    ]);
    const byOwner = new Map<string, MatchItem[]>();
    for (const p of (theirPieces ?? []) as (MatchItem & { owner_id: string })[]) {
      byOwner.set(p.owner_id, [...(byOwner.get(p.owner_id) ?? []), p]);
    }
    for (const [owner, pcs] of byOwner) {
      const m = tasteMatch(all, pcs);
      const username = (names ?? []).find((x) => x.id === owner)?.username as string | undefined;
      if (m && username && (!twin || m.percent > twin.percent)) twin = { username, percent: m.percent };
    }
  }

  const s = (server ?? {}) as YearServer;
  let quizTitle: string | null = null;
  if (s.quiz_best_id) {
    quizTitle = await fetch(`/api/quiz-title?id=${encodeURIComponent(s.quiz_best_id)}`).then((r) => r.json()).then((j) => j.title as string | null).catch(() => null);
  }

  return { year, all, added, kinds, persona: personaFor(pool), decade, person, twin, quizTitle, server: { ...EMPTY, ...s } };
}

const EMPTY: YearServer = {
  visits: 0, visitors: 0, notes: 0, recs: 0, friends: 0, new_friends: 0, now_sets: 0,
  quizzes: 0, quiz_correct: 0, quiz_best: 0, quiz_best_id: null, club_quizzes: 0, clubs: [],
};

/** The year's story is shown in the library from 1 December to 15 January. */
export function yearSeason(now = new Date()): number | null {
  const m = now.getMonth(), d = now.getDate();
  if (m === 11) return now.getFullYear();
  if (m === 0 && d <= 15) return now.getFullYear() - 1;
  return null;
}
