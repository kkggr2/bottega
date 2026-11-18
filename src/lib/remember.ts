"use client";

import { useCallback, useState } from "react";

/*
 * Remember the last thing each screen showed, so coming back to it is instant: the screen shows what
 * it had, and quietly swaps in fresh data when it arrives. Kept in memory for this session and in
 * localStorage for the next one. Keys always include the signed-in person's id, and signing out
 * clears everything.
 */

const PREFIX = "bottega.c1.";
const MAX_BYTES = 300_000;
const memory = new Map<string, unknown>();

export function readCache<T>(key: string): T | undefined {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw) {
      const value = JSON.parse(raw) as T;
      memory.set(key, value);
      return value;
    }
  } catch {}
  return undefined;
}

export function writeCache(key: string, value: unknown): void {
  memory.set(key, value);
  try {
    const raw = JSON.stringify(value);
    if (raw.length < MAX_BYTES) localStorage.setItem(PREFIX + key, raw);
  } catch {}
}

export function forgetCache(key: string): void {
  memory.delete(key);
  try { localStorage.removeItem(PREFIX + key); } catch {}
}

/** On sign-out: nothing of this person's stays on the device. */
export function clearCache(): void {
  memory.clear();
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch {}
}

/**
 * Like useState, but starts from what this key showed last time, and remembers every new value.
 * `usable` can reject a remembered value (for example, yesterday's quiz).
 * When the key changes (another room), it switches to that key's remembered value if there is one,
 * and otherwise keeps showing the current value until fresh data arrives.
 */
export function useRemembered<T>(key: string | null, initial: T, usable?: (value: T) => boolean) {
  const recall = (k: string | null): T | undefined => {
    if (!k) return undefined;
    const v = readCache<T>(k);
    return v !== undefined && (!usable || usable(v)) ? v : undefined;
  };
  const [state, setState] = useState<{ key: string | null; value: T }>(() => ({ key, value: recall(key) ?? initial }));

  let current = state;
  if (state.key !== key) {
    current = { key, value: recall(key) ?? state.value };
    setState(current);
  }

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setState((prev) => {
      const value = typeof next === "function" ? (next as (p: T) => T)(prev.value) : next;
      if (prev.key) writeCache(prev.key, value);
      return { key: prev.key, value };
    });
  }, []);

  return [current.value, set] as const;
}
