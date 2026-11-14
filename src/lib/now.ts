import type { NowSlot, Piece, PieceType, Room } from "./types";

/*
 * What's on right now in a room. Each slot holds one piece and the time it was put there.
 * Friends see what changed since they last stepped in.
 */

export const NOW_SLOTS: NowSlot[] = ["song", "film", "book"];

export function slotFor(type: PieceType): NowSlot | null {
  if (type === "song") return "song";
  if (type === "scene" || type === "poster") return "film";
  if (type === "book") return "book";
  return null;
}

export function nowId(room: Room, slot: NowSlot): string | null {
  return room[`now_${slot}`] ?? null;
}

export function nowAt(room: Room, slot: NowSlot): string | null {
  return room[`now_${slot}_at`] ?? null;
}

/** How the owner leaves something out, and how friends hear about it. */
export const NOW_WORDS: Record<NowSlot, { put: string; take: string; did: (title: string) => string; where: string }> = {
  song: { put: "Leave it on the turntable", take: "Take it off the turntable", did: (t) => `put on ${t}`, where: "On the turntable" },
  film: { put: "Leave it in the TV", take: "Take it out of the TV", did: (t) => `put ${t} in the TV`, where: "In the TV" },
  book: { put: "Leave it on the armchair", take: "Put it back on the shelf", did: (t) => `left ${t} on the armchair`, where: "On the armchair" },
};

/**
 * Once a day: a slot can change again 24 hours after it was last filled
 * (with 10 minutes to change your mind). Matches public.check_now_playing in the database.
 * Returns how long is left, like "5 hours" or "40 minutes", or null if it can change now.
 */
export function waitFor(at: string | null | undefined, now = Date.now()): string | null {
  if (!at) return null;
  const age = now - new Date(at).getTime();
  if (age < 10 * 60e3 || age >= 24 * 3600e3) return null;
  const left = 24 * 3600e3 - age;
  return left >= 3600e3 ? `${Math.ceil(left / 3600e3)} hours` : `${Math.max(1, Math.ceil(left / 60e3))} minutes`;
}

/** "today", "yesterday", "since Tuesday", or a date for anything older than a week. */
export function since(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const then = new Date(iso);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(then)) / 864e5);
  if (days <= 0) return "today";
  if (days === 1) return "since yesterday";
  if (days < 7) return `since ${then.toLocaleDateString(undefined, { weekday: "long" })}`;
  return `since ${then.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

/** Joins "put on Teardrop", "left Normal People on the armchair" into one friendly line. */
export function joinDid(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/* When you last stepped into each friend's room, kept on this device, so the library can mark what's new. */

const SEEN_KEY = (ownerId: string) => `bottega.seen.${ownerId}`;

export function markSeen(ownerId: string): void {
  try {
    localStorage.setItem(SEEN_KEY(ownerId), new Date().toISOString());
  } catch {}
}

export function lastSeen(ownerId: string): string | null {
  try {
    return localStorage.getItem(SEEN_KEY(ownerId));
  } catch {
    return null;
  }
}

export type NowPiece = Pick<Piece, "id" | "type" | "title" | "subtitle" | "cover_url">;
