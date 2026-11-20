"use client";

import { useState, useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n";
import { friendlyError, supabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import type { Room } from "@/lib/types";
import { useAuth } from "./auth";

const KEY = "bottega.bio.dismissed";
const noop = () => () => {};
const read = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

/**
 * In your own room, once it has five pieces: put your room in your Instagram (or Letterboxd, Substack) bio.
 * If only friends can come in, it offers to open the door to everyone first, so the link works for strangers.
 */
export function BioCard({ username, room, onChanged }: { username: string; room: Room; onChanged: () => void }) {
  const t = useT();
  const { guest } = useAuth();
  const dismissedStored = useSyncExternalStore(noop, read, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (guest || dismissed || dismissedStored) return null;

  const link = `bottegarooms.com/r/${username}`;
  const open = room.visibility === "public";

  function hide() {
    try { localStorage.setItem(KEY, "1"); } catch { /* private mode: just hide for now */ }
    setDismissed(true);
  }

  async function openDoor() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase().from("rooms").update({ visibility: "public" }).eq("owner_id", room.owner_id);
    setBusy(false);
    if (err) return setError(friendlyError(err, t("Couldn't save that. Try again.")));
    track("made_public", { detail: "bio" });
    onChanged();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`https://${link}`);
      setCopied(true);
      track("share_link", { detail: "bio" });
    } catch {
      setError(t("Couldn't copy. Press and hold the link to copy it."));
    }
  }

  return (
    <section className="bio-card" aria-label={t("Put your room in your bio")}>
      <p className="smallcaps">{t("Put your room in your bio")}</p>
      <h2>{t("Swap your link in bio for a door.")}</h2>
      {open ? (
        <>
          <p className="muted">{t("Anyone who taps it steps into your room, sees what you love, and can make a room of their own.")}</p>
          <p className="bio-link">{link}</p>
          <div className="row">
            <button className="btn" type="button" onClick={copy}>{copied ? t("Copied") : t("Copy my link")}</button>
            <button className="btn ghost" type="button" onClick={hide}>{t("Not now")}</button>
          </div>
          <p className="hint">{t("On Instagram: Edit profile → Links → Add external link, and paste it.")}</p>
        </>
      ) : (
        <>
          <p className="muted">{t("Right now only friends can come in, so strangers who tap your link would find the door closed. Open your room to everyone? Your notes, messages and clubs stay private either way.")}</p>
          <div className="row">
            <button className="btn" type="button" disabled={busy} onClick={openDoor}>{busy ? t("One moment…") : t("Open my room to everyone")}</button>
            <button className="btn ghost" type="button" onClick={hide}>{t("Not now")}</button>
          </div>
          <p className="hint">{t("You can close it again any time: ⋯ → Customize room → Who can come in.")}</p>
        </>
      )}
      <p className="msg err" aria-live="polite">{error}</p>
    </section>
  );
}
