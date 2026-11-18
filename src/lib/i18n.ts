"use client";

import { useCallback, useSyncExternalStore } from "react";
import { TR } from "./i18n-tr";

/*
 * Bottega in English and Turkish. Text is written in English in the code and wrapped in t("…");
 * the Turkish for each sentence lives in i18n-tr.ts, keyed by the English. Anything not translated
 * yet simply shows in English. {name}-style placeholders are filled from the second argument.
 *
 * The language follows the phone's language, unless someone picks one (saved on this device).
 * The server always renders English; the switch happens right after the page loads.
 */

export type Lang = "en" | "tr";
const KEY = "bottega.lang";
const listeners = new Set<() => void>();

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "tr") return saved;
  } catch {}
  return typeof navigator !== "undefined" && /^tr\b/i.test(navigator.language) ? "tr" : "en";
}

let current: Lang | null = null;
function getLang(): Lang {
  if (current === null) {
    current = detect();
    // So capitals and small caps follow Turkish rules (i → İ).
    if (typeof document !== "undefined") document.documentElement.lang = current;
  }
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  try { localStorage.setItem(KEY, lang); } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => "en");
}

type Vars = Record<string, string | number>;

export function translate(lang: Lang, text: string, vars?: Vars): string {
  // Keys are typed with straight apostrophes; show the typographic one (friends’, Bottega’da).
  let out = (lang === "tr" ? TR[text] ?? text : text).replace(/'/g, "\u2019");
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** const t = useT(); t("Join") · t("{n} people", { n: 3 }) */
export function useT() {
  const lang = useLang();
  return useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);
}

/** Outside React (for example in lib code that returns messages). */
export function t(text: string, vars?: Vars): string {
  return translate(typeof window === "undefined" ? "en" : getLang(), text, vars);
}
