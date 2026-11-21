"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { shareImage } from "@/lib/native";
import { supabase } from "@/lib/supabase";
import { drawMatchCard } from "@/lib/match-card";
import { MIN_PIECES, tasteMatch, type Kind, type MatchItem, type TasteMatch } from "@/lib/taste";
import { track } from "@/lib/track";

/* eslint-disable @next/next/no-img-element -- covers from TMDB, Open Library and Apple Music */

const KIND_WORD: Record<Kind, string> = { film: "films", book: "books", music: "music", poem: "poems", game: "games" };

/**
 * In someone else's room: how alike your taste is, what you share, and one thing of theirs to try.
 * Signed out, it invites you to make a room to find out.
 */
export function TasteMatchCard({ meId, meName, owner, pieces }: {
  meId: string | null;
  meName: string | null;
  /** `name` for a room that isn't a person's account (a famous room): shown as is, without "@". */
  owner: { id: string; username: string; name?: string };
  pieces: MatchItem[];
}) {
  const t = useT();
  const who = owner.name ?? `@${owner.username}`;
  const [mine, setMine] = useState<MatchItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!meId) return;
    supabase().from("pieces").select("id, type, title, subtitle, cover_url").eq("owner_id", meId)
      .then(({ data }) => setMine((data ?? []) as MatchItem[]), () => setMine([]));
  }, [meId]);

  if (!meId) {
    return (
      <section className="match match-teaser" aria-label={t("Taste match")}>
        <p className="smallcaps">{t("Taste match")}</p>
        <p className="match-line">{t("How alike is your taste to {name}'s?", { name: who })}</p>
        <Link className="btn small" href="/#join">{t("Make your room to find out")}</Link>
      </section>
    );
  }
  if (!mine) return null;
  if (pieces.length < MIN_PIECES) return null;
  const match = tasteMatch(mine, pieces);
  if (!match) {
    return (
      <section className="match match-teaser" aria-label={t("Taste match")}>
        <p className="smallcaps">{t("Taste match")}</p>
        <p className="match-line">{t("Hang {n} things in your room to see how alike you and {name} are.", { n: MIN_PIECES, name: who })}</p>
        <Link className="btn small" href={`/r/${meName}`}>{t("Go to my room")}</Link>
      </section>
    );
  }

  async function share(m: TasteMatch) {
    if (!meName) return;
    setBusy(true);
    setNote(null);
    try {
      const blob = await drawMatchCard(m, meName, owner.name ?? owner.username, {
        headline: t("{a} & {b}", { a: `@${meName}`, b: who }),
        alike: t("alike"),
        bothLove: t("We both love"),
        sameMakers: t("Same taste in"),
        cta: t("How alike are we?"),
      });
      const url = `${window.location.origin}/r/${meName}`;
      const result = await shareImage(blob, `bottega-${meName}-${owner.username}.png`, t("How alike are we?"), url);
      if (result === "shared" || result === "saved") track("share_picture", { room: owner.id, detail: `match:${m.percent}` });
      if (result === "saved") setNote(owner.name ? t("Saved. Post it.") : t("Saved. Post it, and tag @{name}.", { name: owner.username }));
      if (result === "failed") setNote(t("Couldn't make the picture. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const word = match.percent >= 80 ? t("Kindred spirits.") : match.percent >= 60 ? t("A lot in common.") : match.percent >= 40 ? t("Some common ground.") : t("Different rooms, worth a visit.");

  return (
    <section className="match" aria-label={t("Taste match")}>
      <div className="match-top">
        <div>
          <p className="smallcaps">{t("Taste match")}</p>
          <p className="match-pct"><b>{match.percent}%</b> {t("alike")}</p>
          <p className="match-word">{word}</p>
        </div>
        <button className="btn small" type="button" disabled={busy} onClick={() => share(match)}>{busy ? t("One moment…") : t("Share our match")}</button>
      </div>

      {match.both.length > 0 && (
        <div className="match-row">
          <p className="smallcaps muted">{t("You both love")}</p>
          <ul className="match-covers">
            {match.both.slice(0, 4).map((p) => (
              <li key={p.id} title={p.title}>
                {/* Through our image proxy, like the share picture, so covers that block direct loading still show. */}
                {p.cover_url ? <img src={`/api/image?url=${encodeURIComponent(p.cover_url)}`} alt={p.title} loading="lazy"
                  onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement("span"), { textContent: p.title })); }} /> : <span>{p.title}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {match.makers.length > 0 && (
        <p className="match-line"><span className="smallcaps muted">{t("Same taste in")}</span> {match.makers.join(", ")}</p>
      )}
      {match.both.length === 0 && match.makers.length === 0 && match.mostly.me && match.mostly.them && match.mostly.me !== match.mostly.them && (
        <p className="match-line">{t("You hang mostly {a}; @{name} hangs mostly {b}.", { a: t(KIND_WORD[match.mostly.me]), b: t(KIND_WORD[match.mostly.them]), name: who })}</p>
      )}
      {match.tryThis && (
        <p className="match-try">
          <span className="smallcaps muted">{t("Try from their room")}</span>{" "}
          <b>{match.tryThis.piece.title}</b>
          <span className="muted"> · {match.tryThis.because.kind === "maker"
            ? t("you both love {name}", { name: match.tryThis.because.name })
            : t("you love {kind}", { kind: t(KIND_WORD[match.tryThis.because.type]) })}</span>
        </p>
      )}
      <p className="msg ok" aria-live="polite">{note}</p>
    </section>
  );
}
