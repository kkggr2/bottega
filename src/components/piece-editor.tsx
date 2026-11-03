"use client";

import { useEffect, useMemo, useState } from "react";
import { toEmbed } from "@/lib/embeds";
import { filmDetails, formatTime, lookupYoutube, parseTime, searchBooks, searchFilms, searchSongs, youtubeId, type Found } from "@/lib/lookup";
import {
  MAX_AUDIO_BYTES,
  MAX_AUDIO_SECONDS,
  audioDuration,
  audioTypeFor,
  compressImage,
  removeMedia,
  uploadMedia,
} from "@/lib/media";
import { friendlyError, supabase } from "@/lib/supabase";
import { PIECE_TYPES } from "@/lib/themes";
import type { Piece, PieceType } from "@/lib/types";
import { SearchPicker } from "./search-picker";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- previews are local blob URLs or remote covers */

type Draft = {
  type: PieceType;
  title: string;
  subtitle: string;
  body: string;
  link: string;
  cover_url: string | null;
  preview_url: string | null;
  clipStart: string;
  clipEnd: string;
};

const TYPE_ORDER: PieceType[] = ["song", "book", "scene", "poster", "poem", "game"];
const SEARCHABLE: PieceType[] = ["song", "book", "scene", "poster"];

export function PieceEditor({
  ownerId,
  existing,
  existingImageUrl,
  initialType,
  onClose,
}: {
  ownerId: string;
  existing: Piece | null;
  existingImageUrl?: string;
  initialType?: PieceType;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    type: existing?.type ?? initialType ?? "song",
    title: existing?.title ?? "",
    subtitle: existing?.subtitle ?? "",
    body: existing?.body ?? "",
    link: existing?.link ?? "",
    cover_url: existing?.cover_url ?? null,
    preview_url: existing?.preview_url ?? null,
    clipStart: formatTime(existing?.clip_start),
    clipEnd: formatTime(existing?.clip_end),
  });
  // undefined = keep what's stored, null = remove it, Blob/File = replace it.
  const [image, setImage] = useState<Blob | null | undefined>(undefined);
  const [audio, setAudio] = useState<File | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [stills, setStills] = useState<string[]>([]);
  const [usedTrailer, setUsedTrailer] = useState(false);
  const meta = PIECE_TYPES[draft.type];
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const preview = useMemo(() => (image instanceof Blob ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const uploadedImage = image === undefined ? existingImageUrl ?? null : null;
  const shownImage = preview ?? uploadedImage ?? draft.cover_url;
  const hasUpload = audio instanceof File || (audio === undefined && Boolean(existing?.audio_path));

  function pick(found: Found) {
    set({
      title: found.title.slice(0, 80),
      subtitle: found.subtitle.slice(0, 80),
      cover_url: found.cover_url,
      preview_url: found.preview_url ?? null,
      link: found.link ?? "",
    });
    setImage(existing?.image_path ? null : undefined); // the found cover replaces an uploaded one
    setMsg(null);
  }

  async function pickFilm(found: Found) {
    setMsg("Looking it up…");
    try {
      const film = await filmDetails(found.id);
      const isScene = draft.type === "scene";
      const keepLink = isScene && youtubeId(draft.link);
      set({
        title: film.title.slice(0, 80),
        subtitle: film.subtitle.slice(0, 80),
        cover_url: isScene ? film.stills[0] ?? film.poster_url : film.poster_url,
        link: isScene ? (keepLink ? draft.link : film.trailer ?? "") : film.link,
      });
      setStills(isScene ? film.stills : []);
      setUsedTrailer(isScene && !keepLink && Boolean(film.trailer));
      setImage(existing?.image_path ? null : undefined);
      setMsg(isScene && !keepLink && !film.trailer ? "No trailer found. Paste a YouTube link to the scene below." : null);
    } catch {
      setMsg("Couldn't look that up. Fill it in by hand below.");
    }
  }

  async function lookUpScene(link: string) {
    if (!youtubeId(link)) return;
    const info = await lookupYoutube(link).catch(() => null);
    if (!info) return;
    setDraft((d) => ({
      ...d,
      title: d.title || info.title.slice(0, 80),
      cover_url: d.cover_url ?? info.cover_url,
      clipStart: d.clipStart || formatTime(info.start),
    }));
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setMsg("Shrinking the image…");
    try {
      setImage(await compressImage(file));
      setMsg(null);
    } catch {
      setMsg("That image couldn't be read. Try a JPG or PNG.");
    }
  }

  async function pickAudio(file: File | undefined) {
    if (!file) return;
    if (!audioTypeFor(file)) return setMsg("Use an MP3, M4A, OGG, WEBM or WAV file.");
    if (file.size > MAX_AUDIO_BYTES) return setMsg("That file is over 10 MB. Try a shorter clip.");
    try {
      const seconds = await audioDuration(file);
      if (seconds > MAX_AUDIO_SECONDS + 1) {
        return setMsg(`Song clips can be up to ${MAX_AUDIO_SECONDS} seconds. This one is ${Math.round(seconds)}. Search for the song instead to use its preview.`);
      }
    } catch {
      return setMsg("That file couldn't be read as audio.");
    }
    setAudio(file);
    setMsg(null);
  }

  async function save() {
    const link = draft.link.trim();
    if (!draft.title.trim()) return setMsg("Give it a title.");
    if (link && !/^https:\/\/\S{3,500}$/i.test(link)) return setMsg("Links need to start with https://");
    const clip_start = draft.type === "scene" ? parseTime(draft.clipStart) : null;
    const clip_end = draft.type === "scene" ? parseTime(draft.clipEnd) : null;
    if (draft.type === "scene") {
      if (draft.clipStart.trim() && clip_start == null) return setMsg("Write the start time like 1:32.");
      if (draft.clipEnd.trim() && clip_end == null) return setMsg("Write the end time like 2:10.");
      if (clip_end != null && clip_end <= (clip_start ?? 0)) return setMsg("The scene has to end after it starts.");
    }
    setBusy(true);
    setMsg(null);

    const uploaded: string[] = [];
    try {
      let image_path = existing?.image_path ?? null;
      let audio_path = existing?.audio_path ?? null;
      if (!meta.image || image === null) image_path = null;
      else if (image instanceof Blob) {
        image_path = await uploadMedia(ownerId, image, "jpg", "image/jpeg");
        uploaded.push(image_path);
      }
      if (draft.type !== "song" || audio === null) audio_path = null;
      else if (audio instanceof File) {
        const ext = audio.name.split(".").pop()!.toLowerCase();
        audio_path = await uploadMedia(ownerId, audio, ext, audioTypeFor(audio)!);
        uploaded.push(audio_path);
      }

      const row = {
        type: draft.type,
        title: draft.title.trim().slice(0, 80),
        subtitle: draft.subtitle.trim().slice(0, 80),
        body: draft.body.slice(0, 4000),
        link: draft.type === "poem" || !link ? null : link,
        image_path,
        audio_path,
        cover_url: meta.image ? draft.cover_url : null,
        preview_url: draft.type === "song" ? draft.preview_url : null,
        clip_start,
        clip_end,
      };
      const sb = supabase();
      const { error } = existing
        ? await sb.from("pieces").update(row).eq("id", existing.id)
        : await sb.from("pieces").insert({ ...row, owner_id: ownerId });
      if (error) throw error;

      if (existing) {
        await removeMedia([
          existing.image_path !== image_path ? existing.image_path : null,
          existing.audio_path !== audio_path ? existing.audio_path : null,
        ]).catch(() => {});
      }
      onClose();
    } catch (error) {
      await removeMedia(uploaded).catch(() => {});
      setBusy(false);
      setMsg(
        error && typeof error === "object" && "message" in error && /cover_url|preview_url|clip_|pieces_type_check/.test(String(error.message))
          ? "The database needs its latest update. Run the newest file in supabase/migrations in the Supabase SQL editor."
          : friendlyError(error, "Couldn't save. Try again."),
      );
    }
  }

  const embed = draft.type === "song" ? toEmbed(draft.link.trim()) : null;

  return (
    <Sheet onClose={onClose} onSubmit={save} label={existing ? "Edit piece" : "Add a piece"}>
      <h2>{existing ? "Edit piece" : "Add to your room"}</h2>

      {!existing && (
        <div className="typegrid" role="group" aria-label="Kind of piece">
          {TYPE_ORDER.map((k) => (
            <button key={k} type="button" aria-pressed={draft.type === k}
              onClick={() => { set({ type: k }); setStills([]); setUsedTrailer(false); setMsg(null); }}>
              <b>{PIECE_TYPES[k].glyph}</b>{PIECE_TYPES[k].label}
            </button>
          ))}
        </div>
      )}

      {draft.type === "song" && (
        <SearchPicker key="song" id="find-song" label="Find a song" placeholder="Song or artist" source="Apple Music"
          search={searchSongs} onPick={pick} />
      )}
      {draft.type === "book" && (
        <SearchPicker key="book" id="find-book" label="Find a book" placeholder="Title or author" source="Open Library"
          search={searchBooks} onPick={pick} />
      )}
      {(draft.type === "poster" || draft.type === "scene") && (
        <SearchPicker key={`film-${draft.type}`} id="find-film" label="Find a film or show" placeholder="Title" source="TMDB"
          search={searchFilms} onPick={pickFilm} />
      )}
      {(draft.type === "poster" || draft.type === "scene") && (
        <p className="credit">Film data and images from TMDB. Bottega uses the TMDB API but is not endorsed or certified by TMDB.</p>
      )}
      {draft.type === "scene" && stills.length > 1 && (
        <div className="field">
          <span className="label">Pick a still for the TV</span>
          <div className="stills" role="group" aria-label="Stills">
            {stills.map((url) => (
              <button key={url} type="button" aria-pressed={draft.cover_url === url} onClick={() => set({ cover_url: url })}>
                <img src={url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
      {draft.type === "scene" && (
        <div className="field">
          <label htmlFor="ed-yt">YouTube link to the scene</label>
          <input id="ed-yt" type="url" placeholder="https://www.youtube.com/watch?v=…" value={draft.link}
            onChange={(e) => { set({ link: e.target.value }); setUsedTrailer(false); }} onBlur={(e) => lookUpScene(e.target.value.trim())} />
          {usedTrailer && <span className="hint">Using the official trailer for now. Paste a link to the exact scene to replace it.</span>}
          <div className="times">
            <div className="field">
              <label htmlFor="ed-start">Starts at</label>
              <input id="ed-start" type="text" inputMode="numeric" placeholder="1:32" value={draft.clipStart}
                onChange={(e) => set({ clipStart: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="ed-end">Ends at</label>
              <input id="ed-end" type="text" inputMode="numeric" placeholder="2:10" value={draft.clipEnd}
                onChange={(e) => set({ clipEnd: e.target.value })} />
            </div>
          </div>
          <span className="hint">The old TV plays just this part. Leave the times empty to play from the start.</span>
        </div>
      )}

      {SEARCHABLE.includes(draft.type) && draft.title && shownImage && (
        <div className="picked">
          <img src={shownImage} alt="" />
          <div>
            <b>{draft.title}</b>
            <span className="muted">{draft.subtitle}</span>
            {draft.preview_url && <span className="mono ok-text">30-second preview included</span>}
          </div>
        </div>
      )}

      <details className="manual" open={Boolean(existing) || !SEARCHABLE.includes(draft.type)}>
        <summary>{SEARCHABLE.includes(draft.type) ? "Edit details or fill in by hand" : "Details"}</summary>
        <div className="stack">
          <div className="field">
            <label htmlFor="ed-title">{meta.title}</label>
            <input id="ed-title" type="text" maxLength={80} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ed-sub">{meta.subtitle}</label>
            <input id="ed-sub" type="text" maxLength={80} value={draft.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
          </div>

          {meta.image && (
            <div className="field">
              <label htmlFor="ed-img">{meta.image}</label>
              <div className="filebox">
                {shownImage && <img src={shownImage} alt="" />}
                <input id="ed-img" type="file" accept="image/*" onChange={(e) => pickImage(e.target.files?.[0])} />
                {shownImage && (
                  <button className="btn ghost small" type="button" onClick={() => { setImage(null); set({ cover_url: null }); }}>
                    Remove image
                  </button>
                )}
              </div>
              <span className="hint">
                {draft.type === "poster" ? "Optional. Without one, a typeset poster is made from the title."
                  : draft.type === "scene" ? "Optional. Shown on the TV until someone presses play."
                  : "Optional. Upload your own to replace the one from search."}
              </span>
            </div>
          )}

          {draft.type === "song" && (
            <div className="field">
              <label htmlFor="ed-audio">Your own clip</label>
              <div className="filebox">
                {hasUpload && <span className="mono">✓ Clip attached</span>}
                <input id="ed-audio" type="file" accept="audio/*,.mp3,.m4a,.ogg,.webm,.wav" onChange={(e) => pickAudio(e.target.files?.[0])} />
                {hasUpload && <button className="btn ghost small" type="button" onClick={() => setAudio(null)}>Detach</button>}
              </div>
              <span className="hint">
                Optional, and plays instead of the preview. Up to {MAX_AUDIO_SECONDS} seconds and 10 MB. Only upload music you have the right to share.
              </span>
            </div>
          )}

          {draft.type !== "poem" && draft.type !== "scene" && (
            <div className="field">
              <label htmlFor="ed-link">Link</label>
              <input id="ed-link" type="url" maxLength={500} placeholder="https://…" value={draft.link} onChange={(e) => set({ link: e.target.value })} />
              <span className="hint">
                {draft.type === "song"
                  ? embed ? `${embed.provider} player appears when someone opens this song.` : "Spotify, Apple Music, YouTube or SoundCloud links get a full player."
                  : "Optional. A trailer, a store page, anything."}
              </span>
            </div>
          )}
        </div>
      </details>

      <div className="field">
        <label htmlFor="ed-body">{meta.body}</label>
        <textarea id="ed-body" maxLength={4000} value={draft.body} onChange={(e) => set({ body: e.target.value })} />
      </div>

      <p className="msg err" aria-live="polite">{msg}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit" disabled={busy}>{busy ? "Placing…" : existing ? "Save" : "Put it in my room"}</button>
      </div>
    </Sheet>
  );
}
