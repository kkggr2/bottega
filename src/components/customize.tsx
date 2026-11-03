"use client";

import { useState } from "react";
import { friendlyError, supabase } from "@/lib/supabase";
import { VISIBILITY, WALLPAPERS } from "@/lib/themes";
import type { Room, Visibility, Wallpaper } from "@/lib/types";
import { Sheet } from "./sheet";
import { ThemeSwatches } from "./theme-swatches";

export function Customize({ room, onClose }: { room: Room; onClose: () => void }) {
  const [draft, setDraft] = useState(room);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    const { error } = await supabase()
      .from("rooms")
      .update({
        name: draft.name.trim() || room.name,
        tagline: draft.tagline.trim(),
        theme: draft.theme,
        wallpaper: draft.wallpaper,
        visibility: draft.visibility,
      })
      .eq("owner_id", room.owner_id);
    setBusy(false);
    if (error) setError(friendlyError(error, "Couldn't save. Try again."));
    else onClose();
  }

  return (
    <Sheet onClose={onClose} onSubmit={save} label="Customize your room">
      <h2>Customize your room</h2>
      <div className="field">
        <label htmlFor="cz-name">Room name</label>
        <input id="cz-name" type="text" maxLength={48} value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="cz-tag">Sign on the door</label>
        <input id="cz-tag" type="text" maxLength={140} placeholder="Come in, take your shoes off." value={draft.tagline}
          onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
      </div>
      <div className="field">
        <span className="label">Walls</span>
        <ThemeSwatches value={draft.theme} onChange={(theme) => setDraft({ ...draft, theme })} />
      </div>
      <div className="field">
        <span className="label">Wallpaper</span>
        <div className="chips">
          {(Object.keys(WALLPAPERS) as Wallpaper[]).map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={draft.wallpaper === k}
              onClick={() => setDraft({ ...draft, wallpaper: k })}>{WALLPAPERS[k]}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Who can come in</span>
        <div className="chips">
          {(Object.keys(VISIBILITY) as Visibility[]).map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={draft.visibility === k}
              onClick={() => setDraft({ ...draft, visibility: k })}>{VISIBILITY[k].label}</button>
          ))}
        </div>
        <span className="hint">{VISIBILITY[draft.visibility].hint}</span>
      </div>
      <p className="msg err">{error}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit" disabled={busy}>Save room</button>
      </div>
    </Sheet>
  );
}
