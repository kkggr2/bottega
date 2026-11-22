"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { connoisseurs, type Connoisseur } from "@/lib/connoisseurs";
import { useT } from "@/lib/i18n";
import { THEMES } from "@/lib/themes";
import type { ThemeKey } from "@/lib/types";

/* eslint-disable @next/next/no-img-element -- covers from TMDB, Open Library and Apple Music */

function useConnoisseurs() {
  const [list, setList] = useState<Connoisseur[] | null>(null);
  useEffect(() => { connoisseurs().then(setList).catch(() => setList([])); }, []);
  return list;
}

function Cards({ list }: { list: Connoisseur[] }) {
  const t = useT();
  return (
    <ul className="visit-row">
      {list.map((c) => {
        const th = THEMES[c.theme as ThemeKey] ?? THEMES.oak;
        return (
          <li key={c.username}>
            <Link href={`/r/${c.username}`} className="visit-card conno-card" style={{ background: th.wall, color: th.ink }}>
              <span className="visit-covers">
                {c.covers.slice(0, 3).map((u) => <img key={u} src={`/api/image?url=${encodeURIComponent(u)}`} alt="" loading="lazy" />)}
              </span>
              <span className="conno-badge">✦ {t("No. {n}", { n: c.number })}</span>
              <b>{c.room_name || `@${c.username}`}</b>
              <span className="visit-blurb">@{c.username}{c.note ? ` · ${c.note}` : ""}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** A row of Founding Connoisseurs, for the Library and the welcome page. Hidden when there are none. */
export function ConnoisseursRow() {
  const t = useT();
  const list = useConnoisseurs();
  if (!list?.length) return null;
  return (
    <section className="visit" aria-label={t("Founding Connoisseurs")}>
      <div className="tonight-head">
        <div>
          <p className="smallcaps">{t("Founding Connoisseurs")}</p>
          <h2>{t("People whose taste we'd love you to discover")}</h2>
        </div>
        <Link className="mono conno-all" href="/connoisseurs">{t("See all")} →</Link>
      </div>
      <Cards list={list} />
    </section>
  );
}

/** /connoisseurs: the whole wall. */
export function ConnoisseursIndex() {
  const t = useT();
  const list = useConnoisseurs();
  return (
    <div>
      <section className="lib-head">
        <div>
          <p className="smallcaps">{t("Founding Connoisseurs")}</p>
          <h1>{t("The first fifty")}</h1>
          <p>{t("Bottega's first Connoisseurs, invited for their taste. Step into their rooms, and see how alike you are.")}</p>
        </div>
      </section>
      {list === null ? null : list.length ? <Cards list={list} /> : <p className="muted">{t("The first Connoisseurs are on their way.")}</p>}
    </div>
  );
}

/** The gold badge under a Connoisseur's name in their room. */
export function ConnoisseurBadge({ number }: { number: number }) {
  const t = useT();
  return (
    <Link className="conno-badge on-room" href="/connoisseurs">
      ✦ {t("Founding Connoisseur")} · {t("No. {n}", { n: number })}
    </Link>
  );
}
