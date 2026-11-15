"use client";

import { useEffect } from "react";
import { THEMES } from "./themes";
import type { ThemeKey } from "./types";

/*
 * Stepping into a room: the whole screen takes on that room's colours (its wall, ink and accent),
 * not just the room itself. Goes back to Bottega's own colours when you leave.
 */
export function useRoomColors(theme: ThemeKey | null | undefined): void {
  useEffect(() => {
    const t = theme ? THEMES[theme] : null;
    if (!t) return;
    const root = document.documentElement;
    const vars: Record<string, string> = {
      "--bg": t.wall,
      "--fg": t.ink,
      "--surface": `color-mix(in srgb, ${t.wall} 88%, ${t.ink})`,
      "--muted": `color-mix(in srgb, ${t.ink} 64%, ${t.wall})`,
      "--line": `color-mix(in srgb, ${t.ink} 18%, ${t.wall})`,
      "--brass": t.accent,
    };
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.classList.add("in-room");
    const meta = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    const before = [...meta].map((m) => m.content);
    meta.forEach((m) => { m.content = t.wall; });
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k);
      root.classList.remove("in-room");
      meta.forEach((m, i) => { m.content = before[i]; });
    };
  }, [theme]);
}
