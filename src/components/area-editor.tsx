"use client";

import { useState } from "react";
import { removeMedia } from "@/lib/media";
import { imageOf } from "@/lib/piece-media";
import { friendlyError, supabase } from "@/lib/supabase";
import type { Piece, PieceType } from "@/lib/types";
import { firstLine } from "./piece-view";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- covers and signed storage URLs */

/*
 * Editing a whole part of your room at once: the wall, the DVD pile, the bookcase, the records.
 * Tick some (or all) to move films between the wall and the DVD pile, or to take them out; on the wall, change the
 * words on each plaque right here. Opened from a small "Edit …" button on each part, visible only to the owner.
 */

export type Area = "wall" | "screen" | "books" | "music";

const AREAS: Record<Area, { button: string; title: string; how: string; move?: { from: PieceType; to: PieceType; label: (n: number) => string; done: (n: number) => string } }> = {
  wall: {
    button: "Edit wall", title: "Your wall",
    how: "Tick posters to move them to the DVD pile or take them down. Tap Words to change what a plaque says.",
    move: { from: "poster", to: "scene", label: (n) => `Move ${n} to the DVD pile`, done: (n) => (n === 1 ? "Moved 1 to the DVD pile." : `Moved ${n} to the DVD pile.`) },
  },
  screen: {
    button: "Edit DVD pile", title: "Your DVD pile",
    how: "Tick films to hang them on the wall as posters, or take them out.",
    move: { from: "scene", to: "poster", label: (n) => `Hang ${n} on the wall`, done: (n) => (n === 1 ? "Hung 1 on the wall." : `Hung ${n} on the wall.`) },
  },
  books: { button: "Edit bookcase", title: "Your bookcase", how: "Tick books to take them off the shelf." },
  music: { button: "Edit records", title: "Your records", how: "Tick records to take them out of the crate." },
};

/** The small button on each part of the room. Quiet, but always there for the owner. */
export function AreaEditButton({ area, onClick }: { area: Area; onClick: () => void }) {
  return <button type="button" className="area-edit" onClick={onClick}>✎ {AREAS[area].button}</button>;
}

export function AreaEditor({ area, pieces, urls, wallSpace = 12, onChanged, onClose }: {
  area: Area;
  pieces: Piece[];
  urls: Record<string, string>;
  /** How many more the wall can take (it holds WALL_MAX). */
  wallSpace?: number;
  /** After a change: reload the room. `removed` lets the room stop a record or film that just went. */
  onChanged: (removed: string[]) => Promise<void> | void;
  onClose: () => void;
}) {
  const a = AREAS[area];
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [words, setWords] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const chosen = pieces.filter((p) => picked.has(p.id));
  const movable = a.move ? chosen.filter((p) => p.type === a.move!.from) : [];
  // Hanging on the wall only fits as many as it has space for.
  const tooMany = area === "screen" && movable.length > wallSpace;
  const all = pieces.length > 0 && picked.size === pieces.length;

  const toggle = (id: string) => {
    setConfirming(false);
    setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  async function run(task: () => Promise<{ error: unknown }>, done: string, removed: string[] = []) {
    setBusy(true);
    setMsg(null);
    const { error } = await task();
    setBusy(false);
    setConfirming(false);
    if (error) return setMsg({ kind: "err", text: friendlyError(error, "Couldn't change that. Try again.") });
    setPicked(new Set());
    setMsg({ kind: "ok", text: done });
    await onChanged(removed);
  }

  const move = () => a.move && run(
    async () => await supabase().from("pieces").update({ type: a.move!.to }).in("id", movable.map((p) => p.id)),
    a.move.done(movable.length),
  );

  const takeOut = () => {
    const ids = chosen.map((p) => p.id);
    return run(async () => {
      const res = await supabase().from("pieces").delete().in("id", ids);
      if (!res.error) await removeMedia(chosen.flatMap((p) => [p.image_path, p.audio_path])).catch(() => {});
      return res;
    }, ids.length === 1 ? "Took 1 out." : `Took ${ids.length} out.`, ids);
  };

  const saveWords = () => words && run(
    async () => await supabase().from("pieces").update({ body: words.text.trim() }).eq("id", words.id),
    "The plaque is updated.",
  ).then(() => setWords(null));

  return (
    <Sheet onClose={onClose} label={a.title}>
      <h2>{a.title}</h2>
      <p className="muted">{a.how}</p>

      {pieces.length === 0 ? <p className="muted">Nothing here now.</p> : (
        <>
          <button type="button" className="linkish area-all" onClick={() => { setConfirming(false); setPicked(all ? new Set() : new Set(pieces.map((p) => p.id))); }}>
            {all ? "Clear" : `Select all ${pieces.length}`}
          </button>
          <ul className="area-list">
            {pieces.map((p) => {
              const img = imageOf(p, urls);
              const plaque = area === "wall" && p.type === "poster" ? firstLine(p.body) : "";
              const editing = words?.id === p.id;
              return (
                <li key={p.id} className={picked.has(p.id) ? "on" : undefined}>
                  <label className="area-row">
                    <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                    {img ? <img src={img} alt="" loading="lazy" /> : <span className="noart" aria-hidden="true" />}
                    <span>
                      <b>{p.title}</b>
                      <span className="muted">{p.subtitle}</span>
                      {area === "wall" && p.type === "poster" && !editing && (
                        <span className={`area-plaque${plaque ? "" : " empty"}`}>{plaque ? `“${plaque}”` : "No words on the plaque yet"}</span>
                      )}
                    </span>
                  </label>
                  {area === "wall" && p.type === "poster" && (editing ? (
                    <div className="area-words">
                      <label className="sr-only" htmlFor={`words-${p.id}`}>Words for {p.title}</label>
                      <textarea id={`words-${p.id}`} rows={3} maxLength={2000} autoFocus value={words.text}
                        onChange={(e) => setWords({ id: p.id, text: e.target.value })} placeholder="Why this one" />
                      <span className="hint">The first line goes on the plaque; the rest shows when someone opens it.</span>
                      <div className="row">
                        <button type="button" className="btn ghost small" onClick={() => setWords(null)}>Cancel</button>
                        <button type="button" className="btn small" disabled={busy} onClick={() => void saveWords()}>Save words</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="linkish area-words-open" onClick={() => setWords({ id: p.id, text: p.body })}>Words</button>
                  ))}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className={`msg ${msg?.kind ?? ""}`} aria-live="polite">{msg?.text}</p>
      {tooMany && (
        <p className="hint">{wallSpace === 0
          ? "The wall holds 12 and it's full. Take one down from the wall first."
          : `The wall has room for ${wallSpace} more. Tick ${wallSpace} or fewer to hang them.`}</p>
      )}

      <div className="row stacked area-actions">
        {chosen.length === 0 ? (
          <button className="btn" type="button" onClick={onClose}>Done</button>
        ) : confirming ? (
          <>
            <button className="btn ghost" type="button" onClick={() => setConfirming(false)}>Keep them</button>
            <button className="btn danger-solid" type="button" disabled={busy} onClick={() => void takeOut()}>
              {chosen.length === 1 ? "Yes, take 1 out" : `Yes, take ${chosen.length} out`}
            </button>
          </>
        ) : (
          <>
            {a.move && movable.length > 0 && (
              <button className="btn" type="button" disabled={busy || tooMany} onClick={() => void move()}>
                {area === "screen" && wallSpace === 0 ? "The wall is full" : a.move.label(movable.length)}
              </button>
            )}
            <button className="btn ghost danger-text" type="button" disabled={busy} onClick={() => setConfirming(true)}>
              {chosen.length === 1 ? "Take 1 out" : `Take ${chosen.length} out`}
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
