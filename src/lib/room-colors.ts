"use client";

import { useEffect } from "react";
import { THEMES } from "./themes";
import type { ThemeKey } from "./types";

/*
 * Stepping into a room: the whole screen takes on that room's colours (its wall, ink and accent),
 * not just the room itself. Goes back to Bottega's own colours when you leave.
 * The Salon and the Quiz room use the same idea with their own fixed palettes.
 */

export type Palette = { wall: string; ink: string; accent: string };

/** The Salon: a lamp-lit sitting room. The Quiz room: green baize under a brass lamp. */
export const SALON: Palette = { wall: "#3A1A22", ink: "#F3E6D6", accent: "#E0A35C" };
export const QUIZ_ROOM: Palette = { wall: "#16352A", ink: "#EEF0DF", accent: "#E8C46A" };

export function usePalette(p: Palette | null, mood?: "salon" | "quiz"): void {
  const wall = p?.wall, ink = p?.ink, accent = p?.accent;
  useEffect(() => {
    if (!wall || !ink || !accent) return;
    const root = document.documentElement;
    const vars: Record<string, string> = {
      "--bg": wall,
      "--fg": ink,
      "--surface": `color-mix(in srgb, ${wall} 88%, ${ink})`,
      "--muted": `color-mix(in srgb, ${ink} 64%, ${wall})`,
      "--line": `color-mix(in srgb, ${ink} 18%, ${wall})`,
      "--brass": accent,
    };
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.classList.add("in-room");
    if (mood) root.dataset.mood = mood;
    const meta = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    const before = [...meta].map((m) => m.content);
    meta.forEach((m) => { m.content = wall; });
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k);
      root.classList.remove("in-room");
      delete root.dataset.mood;
      meta.forEach((m, i) => { m.content = before[i]; });
    };
  }, [wall, ink, accent, mood]);
}

export function useRoomColors(theme: ThemeKey | null | undefined): void {
  const t = theme ? THEMES[theme] : null;
  usePalette(t ? { wall: t.wall, ink: t.ink, accent: t.accent } : null);
}
