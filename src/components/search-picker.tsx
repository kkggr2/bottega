"use client";

import { useEffect, useRef, useState } from "react";
import type { Found } from "@/lib/lookup";

/* eslint-disable @next/next/no-img-element -- remote cover thumbnails */

/** A search box that lists matches as you type and hands back the one you pick. */
export function SearchPicker({
  id,
  label,
  placeholder,
  source,
  search,
  onPick,
}: {
  id: string;
  label: string;
  placeholder: string;
  source: string;
  search: (term: string, signal: AbortSignal) => Promise<Found[]>;
  onPick: (found: Found) => void;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [state, setState] = useState<"idle" | "searching" | "empty" | "error">("idle");

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState("searching");
      try {
        const found = await search(q, controller.signal);
        setResults(found);
        setState(found.length ? "idle" : "empty");
      } catch {
        if (!controller.signal.aborted) setState("error");
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, search]);

  const showResults = term.trim().length >= 2 && results.length > 0;

  // Listen to a result before picking it, so you can find the right version.
  const audio = useRef<HTMLAudioElement | null>(null);
  const [listening, setListening] = useState<string | null>(null);
  const stop = () => { audio.current?.pause(); setListening(null); };
  const listen = (r: Found) => {
    if (listening === r.id) return stop();
    audio.current?.pause();
    const a = new Audio(r.preview_url!);
    a.onended = () => setListening(null);
    audio.current = a;
    setListening(r.id);
    a.play().catch(() => setListening(null));
  };
  useEffect(() => () => audio.current?.pause(), []);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="search" enterKeyHint="search" autoComplete="off" placeholder={placeholder} value={term}
        onChange={(e) => { setTerm(e.target.value); if (e.target.value.trim().length < 2) setResults([]); }}
        aria-controls={`${id}-results`} />
      <span className="hint" aria-live="polite">
        {state === "searching" ? "Searching…"
          : state === "empty" ? "Nothing found. Try fewer words, or fill it in by hand below."
          : state === "error" ? `Can't reach ${source} right now. Fill it in by hand below.`
          : `Results from ${source}.`}
      </span>
      {showResults && (
        <ul className="results" id={`${id}-results`}>
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => { stop(); onPick(r); setTerm(""); setResults([]); }}>
                {r.cover_url ? <img src={r.cover_url} alt="" loading="lazy" /> : <span className="noart" aria-hidden="true" />}
                <span><b>{r.title}</b><span className="muted">{r.subtitle}</span>{r.detail && <span className="detail muted">{r.detail}</span>}</span>
              </button>
              {r.preview_url && (
                <button type="button" className="listen" aria-pressed={listening === r.id} onClick={() => listen(r)}
                  aria-label={listening === r.id ? `Stop ${r.title}` : `Listen to ${r.title}`}>
                  {listening === r.id ? "\u25A0" : "\u25B6\uFE0E"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
