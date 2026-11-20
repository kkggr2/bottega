"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { featuredRooms, type FeaturedRoom } from "@/lib/featured";
import { useT } from "@/lib/i18n";
import { THEMES } from "@/lib/themes";
import type { ThemeKey } from "@/lib/types";

/* eslint-disable @next/next/no-img-element -- covers from TMDB, Open Library and Apple Music */

/** Rooms by bookshops, cinemas, clubs and critics that anyone can step into. Hidden when there are none. */
export function RoomsToVisit({ title }: { title?: string }) {
  const t = useT();
  const [rooms, setRooms] = useState<FeaturedRoom[] | null>(null);
  useEffect(() => { featuredRooms().then(setRooms).catch(() => setRooms([])); }, []);
  if (!rooms?.length) return null;
  return (
    <section className="visit" aria-label={t("Rooms to visit")}>
      <div className="tonight-head">
        <div>
          <p className="smallcaps">{t("Rooms to visit")}</p>
          <h2>{title ?? t("Step into a bookshop, a cinema, a club")}</h2>
        </div>
      </div>
      <ul className="visit-row">
        {rooms.map((r) => {
          const th = THEMES[r.theme as ThemeKey] ?? THEMES.oak;
          return (
            <li key={r.username}>
              <Link href={`/r/${r.username}`} className="visit-card" style={{ background: th.wall, color: th.ink }}>
                <span className="visit-covers">
                  {r.covers.slice(0, 3).map((u) => <img key={u} src={`/api/image?url=${encodeURIComponent(u)}`} alt="" loading="lazy" />)}
                </span>
                <span className="smallcaps visit-label" style={{ color: th.accent }}>{r.label}</span>
                <b>{r.room_name || `@${r.username}`}</b>
                {r.blurb && <span className="visit-blurb">{r.blurb}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
