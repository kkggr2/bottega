import type { CSSProperties } from "react";
import type { PieceType, Room, ThemeKey, Visibility, Wallpaper } from "./types";

export const THEMES: Record<ThemeKey, { name: string; wall: string; floor: string; ink: string; accent: string }> = {
  oak:      { name: "Oak study", wall: "#E8DCC4", floor: "#6E4A30", ink: "#2A1D13", accent: "#A33F27" },
  midnight: { name: "Midnight",  wall: "#1F2442", floor: "#12152B", ink: "#E8E4F6", accent: "#E2B35A" },
  rose:     { name: "Rosewater", wall: "#F1D7D2", floor: "#865357", ink: "#3A1D22", accent: "#B23A5B" },
  moss:     { name: "Moss",      wall: "#2F3B2C", floor: "#1B2318", ink: "#E3E9D4", accent: "#B9C95A" },
  seaglass: { name: "Seaglass",  wall: "#CDE2DD", floor: "#3D6A66", ink: "#12302D", accent: "#DD703A" },
  gallery:  { name: "Gallery",   wall: "#F6F5F0", floor: "#BDB7A8", ink: "#1A1A1A", accent: "#2149C9" },
};

export const WALLPAPERS: Record<Wallpaper, string> = {
  plain: "Plain",
  stripe: "Stripes",
  dots: "Dots",
  grid: "Tiles",
  damask: "Damask",
};

export const VISIBILITY: Record<Visibility, { label: string; hint: string }> = {
  friends: { label: "Friends", hint: "Only accepted friends can step inside." },
  public: { label: "Anyone with the link", hint: "Anyone can look around, even without an account." },
  private: { label: "Just me", hint: "The door stays locked. Friends see the name only." },
};

/** Where a piece lives in the room. */
export type Zone = "wall" | "books" | "music" | "screen";

export const PIECE_TYPES: Record<
  PieceType,
  { label: string; glyph: string; title: string; subtitle: string; body: string; image?: string; zone: Zone }
> = {
  poster: { label: "Poster", glyph: "▯", title: "Film", subtitle: "Director · year", body: "Why this one", image: "Poster image", zone: "wall" },
  scene:  { label: "Scene",  glyph: "▭", title: "Film or show", subtitle: "Director · year", body: "The moment, in your words", image: "Still image", zone: "screen" },
  poem:   { label: "Poem",   glyph: "¶", title: "Title", subtitle: "Poet", body: "The poem", zone: "wall" },
  song:   { label: "Song",   glyph: "◉", title: "Song", subtitle: "Artist · year", body: "Why it's on your wall", image: "Cover art", zone: "music" },
  game:   { label: "Game",   glyph: "▣", title: "Game", subtitle: "Studio · year", body: "What it meant to you", image: "Box art", zone: "screen" },
  book:   { label: "Book",   glyph: "❚", title: "Book", subtitle: "Author · year", body: "What stayed with you", image: "Cover", zone: "books" },
};

export const MAX_PIECES = 80;
export const USERNAME = /^[a-z0-9_]{3,20}$/;

export function roomStyle(room: Pick<Room, "theme"> | null | undefined): CSSProperties {
  const t = THEMES[room?.theme ?? "oak"] ?? THEMES.oak;
  return { "--wall": t.wall, "--floor": t.floor, "--rink": t.ink, "--raccent": t.accent } as CSSProperties;
}
