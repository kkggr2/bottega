"use client";

import { useCallback, useEffect, useState } from "react";
import { befriend } from "@/lib/friends";
import { useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { MIN_PIECES, type MatchItem } from "@/lib/taste";
import { track } from "@/lib/track";
import { findTwins, isOptedIn, setOptIn, type Twin } from "@/lib/twins";
import { useAuth } from "./auth";

/* eslint-disable @next/next/no-img-element -- covers from TMDB, Open Library and Apple Music */

/**
 * In the library: people anywhere whose rooms are most like yours. Off until you switch it on;
 * then you see others who switched it on too, and can ask to swap keys.
 */
export function TasteTwins({ meId }: { meId: string }) {
  const t = useT();
  const { guest } = useAuth();
  const [on, setOn] = useState<boolean | null>(null);
  const [mine, setMine] = useState<MatchItem[] | null>(null);
  const [twins, setTwins] = useState<Twin[] | null>(null);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [opted, { data }] = await Promise.all([
      isOptedIn(meId),
      supabase().from("pieces").select("id, type, title, subtitle, cover_url").eq("owner_id", meId),
    ]);
    const pieces = (data ?? []) as MatchItem[];
    setOn(opted);
    setMine(pieces);
    if (opted && pieces.length >= MIN_PIECES) setTwins(await findTwins(pieces));
  }, [meId]);
  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open

  if (on === null || !mine || guest) return null;

  async function toggle(next: boolean) {
    setBusy(true);
    setError(null);
    const err = await setOptIn(meId, next);
    setBusy(false);
    if (err) return setError(t(err));
    track("made_public", { detail: next ? "twins_on" : "twins_off" });
    setTwins(null);
    void load();
  }

  async function ask(tw: Twin) {
    setAsked((s) => new Set(s).add(tw.userId));
    try {
      await befriend(meId, tw.userId);
      track("friend_request", { room: tw.userId, detail: `twin:${tw.match.percent}` });
    } catch {
      setAsked((s) => { const n = new Set(s); n.delete(tw.userId); return n; });
    }
  }

  if (!on) {
    return (
      <section className="twins twins-off" aria-label={t("Taste twins")}>
        <p className="smallcaps">{t("Taste twins")}</p>
        <h2>{t("Somewhere in the world, someone's room is a lot like yours.")}</h2>
        <p className="muted">{t("Switch this on to meet the people whose rooms are most like yours, anywhere. They see your username and what's on your walls, and you see theirs. Your notes, messages and room stay as private as you set them; to come in, they ask to swap keys.")}</p>
        <div className="row">
          <button className="btn" type="button" disabled={busy} onClick={() => toggle(true)}>{busy ? t("One moment…") : t("Find my taste twins")}</button>
        </div>
        <p className="msg err" aria-live="polite">{error}</p>
      </section>
    );
  }

  return (
    <section className="twins" aria-label={t("Taste twins")}>
      <div className="tonight-head">
        <div>
          <p className="smallcaps">{t("Taste twins")}</p>
          <h2>{t("Rooms like yours, around the world")}</h2>
        </div>
      </div>
      {mine.length < MIN_PIECES ? (
        <p className="muted">{t("Hang {n} things in your room and your taste twins appear here.", { n: MIN_PIECES })}</p>
      ) : twins === null ? (
        <p className="muted">{t("Looking for rooms like yours…")}</p>
      ) : twins.length === 0 ? (
        <p className="muted">{t("No twins yet. As more people switch this on, the rooms most like yours will appear here.")}</p>
      ) : (
        <ul className="twin-list">
          {twins.map((tw) => {
            const covers = tw.match.both.filter((p) => p.cover_url).slice(0, 3);
            const why = tw.match.both.length
              ? tw.match.both.slice(0, 2).map((p) => p.title).join(", ")
              : tw.match.makers.slice(0, 2).join(", ");
            return (
              <li key={tw.userId} className="twin">
                <div className="twin-pct"><b>{tw.match.percent}%</b><span>{t("alike")}</span></div>
                <div className="twin-main">
                  <b>@{tw.username}</b>
                  {why && <span className="muted">{tw.match.both.length ? t("You both love {list}", { list: why }) : t("Same taste in {list}", { list: why })}</span>}
                  {covers.length > 0 && (
                    <span className="twin-covers">
                      {covers.map((p) => <img key={p.id} src={`/api/image?url=${encodeURIComponent(p.cover_url!)}`} alt={p.title} loading="lazy" />)}
                    </span>
                  )}
                </div>
                <button className="btn small" type="button" disabled={asked.has(tw.userId)} onClick={() => ask(tw)}>
                  {asked.has(tw.userId) ? t("Asked") : t("Swap keys")}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" className="linkish twins-off-link" disabled={busy} onClick={() => toggle(false)}>{t("Stop showing me to taste twins")}</button>
      <p className="msg err" aria-live="polite">{error}</p>
    </section>
  );
}
