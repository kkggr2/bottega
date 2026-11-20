"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { shareImage, tap } from "@/lib/native";
import { track } from "@/lib/track";
import { drawYearCard, type YearCardSpec } from "@/lib/year-card";
import { loadYear, yearSeason, type Year } from "@/lib/year";
import type { Profile } from "@/lib/types";
import { Gate } from "./gate";

/* eslint-disable @next/next/no-img-element -- covers from TMDB, Open Library and Apple Music */

/*
 * Your Year in the Room: a story of tap-through cards, each one shareable as a Story picture.
 * Every picture ends with your room's link, so each share is an invitation.
 */

export function YearScreen() {
  return <Gate>{(me) => <YearStory me={me} />}</Gate>;
}

const KIND_WORD = { film: "films", book: "books", music: "records", poem: "poems", game: "games" } as const;

type Card = YearCardSpec & { key: string; body?: React.ReactNode };

function YearStory({ me }: { me: Profile }) {
  const t = useT();
  const [data, setData] = useState<Year | null | "error">(null);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    loadYear(me.id, yearSeason() ?? new Date().getFullYear()).then(setData).catch(() => setData("error"));
  }, [me.id]);

  if (data === null) return <p className="loading">{t("Looking back at your year…")}</p>;
  if (data === "error") return <p className="loading">{t("Couldn't load your year. Try again.")}</p>;

  const y = data;
  const s = y.server;
  const foot = `bottegarooms.com/r/${me.username}`;
  const covers = (list: typeof y.all) => list.map((p) => p.cover_url).filter((u): u is string => Boolean(u));
  const shown = y.added.length >= 3 ? y.added : y.all;

  const cards: Card[] = [];
  cards.push({ key: "intro", bg: "#2F3B2C", ink: "#F2E8D3", accent: "#E9A04B",
    kicker: t("Bottega · {year}", { year: y.year }), big: t("Your {year} in the room", { year: y.year }),
    line: t("@{name}, here's what your walls said about you this year.", { name: me.username }), foot });
  if (shown.length) {
    cards.push({ key: "hung", bg: "#3A1A22", ink: "#F3E6D6", accent: "#E0A35C",
      kicker: y.added.length >= 3 ? t("This year you hung") : t("On your walls"),
      big: shown.length === 1 ? t("1 thing you love") : t("{n} things you love", { n: shown.length }),
      line: y.kinds.slice(0, 3).map((k) => `${Math.round(k.share * 100)}% ${t(KIND_WORD[k.kind])}`).join(" · "),
      covers: covers(shown).slice(-6), foot });
  }
  cards.push({ key: "persona", bg: "#16352A", ink: "#EEF0DF", accent: "#E8C46A",
    kicker: t("Your taste, in one name"), big: t(y.persona.name), line: t(y.persona.line), foot });
  if (y.person || y.decade) {
    cards.push({ key: "person", bg: "#E8DCC4", ink: "#2A1D13", accent: "#A33F27",
      kicker: y.person ? t("Your person") : t("Your decade"),
      big: y.person ? y.person.name : t("The {d}s", { d: y.decade! }),
      line: y.person
        ? t("{n} times on your walls.", { n: y.person.count }) + (y.decade ? ` ${t("Your decade: the {d}s.", { d: y.decade })}` : "")
        : t("Most of what you love was made then."),
      foot });
  }
  if (s.visits > 0 || s.notes > 0) {
    cards.push({ key: "visits", bg: "#1C1A1C", ink: "#EDE7DD", accent: "#C9B37E",
      kicker: t("Your door was open"),
      big: s.visitors === 1 ? t("1 visitor") : t("{n} visitors", { n: s.visitors }),
      line: [s.visits > s.visitors ? t("{n} visits in all", { n: s.visits }) : null,
        s.notes ? (s.notes === 1 ? t("1 note on your wall") : t("{n} notes on your wall", { n: s.notes })) : null,
        s.recs ? (s.recs === 1 ? t("1 recommendation left for you") : t("{n} recommendations left for you", { n: s.recs })) : null,
      ].filter(Boolean).join(" · "), foot });
  }
  if (s.quizzes > 0) {
    cards.push({ key: "quiz", bg: "#16352A", ink: "#EEF0DF", accent: "#E8C46A",
      kicker: t("In the Quiz room"),
      big: s.quizzes === 1 ? t("1 quiz played") : t("{n} quizzes played", { n: s.quizzes }),
      line: t("{c} right answers · best score {b}", { c: s.quiz_correct, b: s.quiz_best }) + (y.quizTitle ? ` (${y.quizTitle})` : ""), foot });
  }
  if (y.twin) {
    cards.push({ key: "twin", bg: "#3A1A22", ink: "#F3E6D6", accent: "#E0A35C",
      kicker: t("Your taste twin this year"), big: `@${y.twin.username}`,
      line: t("{p}% alike. Go see what's on their walls.", { p: y.twin.percent }), foot });
  }
  if (s.clubs.length) {
    cards.push({ key: "clubs", bg: "#3A1A22", ink: "#F3E6D6", accent: "#E0A35C",
      kicker: s.clubs.length === 1 ? t("Your club") : t("Your clubs"),
      big: s.clubs.slice(0, 3).map((c) => `${c.emoji} ${c.name}`).join(" · "),
      line: s.club_quizzes ? t("{n} club quizzes played together.", { n: s.club_quizzes }) : undefined, foot });
  }
  cards.push({ key: "outro", bg: "#2F3B2C", ink: "#F2E8D3", accent: "#E9A04B",
    kicker: t("My {year} in the room", { year: y.year }), big: t(y.persona.name),
    line: [shown.length ? t("{n} things on my walls", { n: shown.length }) : null, y.person ? y.person.name : null,
      y.twin ? t("taste twin @{name}", { name: y.twin.username }) : null].filter(Boolean).join(" · "),
    covers: covers(y.all).slice(-3), foot: t("How alike are we? {link}", { link: foot }) });

  const card = cards[Math.min(i, cards.length - 1)];
  const go = (d: number) => { tap(); setNote(null); setI((x) => Math.max(0, Math.min(cards.length - 1, x + d))); };

  async function share() {
    setBusy(true);
    setNote(null);
    try {
      const blob = await drawYearCard(card);
      const result = await shareImage(blob, `bottega-${y.year}-${card.key}.png`, t("My {year} in the room", { year: y.year }), `${window.location.origin}/r/${me.username}`);
      if (result === "shared" || result === "saved") track("share_picture", { detail: `year:${card.key}` });
      if (result === "saved") setNote(t("Saved. Post it to your story."));
      if (result === "failed") setNote(t("Couldn't make the picture. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="year" style={{ background: card.bg, color: card.ink }} aria-roledescription="story">
      <div className="year-bars" aria-hidden="true">
        {cards.map((c, k) => <span key={c.key} className={k <= i ? "on" : ""} style={{ background: k <= i ? card.ink : undefined }} />)}
      </div>
      <div className="year-card" aria-live="polite">
        <p className="year-kicker" style={{ color: card.accent }}>{card.kicker}</p>
        <h1 className="year-big">{card.big}</h1>
        {card.line && <p className="year-line">{card.line}</p>}
        {card.covers && card.covers.length > 0 && (
          <div className="year-covers">
            {card.covers.slice(0, 6).map((u) => <img key={u} src={`/api/image?url=${encodeURIComponent(u)}`} alt="" loading="lazy" />)}
          </div>
        )}
      </div>
      <button type="button" className="year-tap prev" aria-label={t("Back")} onClick={() => go(-1)} />
      <button type="button" className="year-tap next" aria-label={t("Next")} onClick={() => go(1)} />
      <div className="year-foot">
        <button className="btn" type="button" disabled={busy} onClick={share} style={{ background: card.ink, color: card.bg }}>
          {busy ? t("One moment…") : i === cards.length - 1 ? t("Share my year") : t("Share this")}
        </button>
        {i === cards.length - 1 ? <Link href="/" className="year-done" style={{ color: card.ink }}>{t("Done")}</Link>
          : <span className="year-hint">{t("Tap to go on")}</span>}
        <p className="year-note" aria-live="polite">{note}</p>
      </div>
    </section>
  );
}

/** In the library from 1 December to 15 January: the way in. */
export function YearBanner() {
  const t = useT();
  const year = yearSeason();
  if (!year) return null;
  return (
    <Link href="/year" className="year-banner">
      <span className="smallcaps">{t("Bottega · {year}", { year })}</span>
      <b>{t("Your {year} in the room", { year })}</b>
      <span className="muted">{t("What your walls said about you this year, in a few cards to share.")}</span>
    </Link>
  );
}
