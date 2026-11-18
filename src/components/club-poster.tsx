"use client";

import qrcode from "qrcode-generator";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clubPublic, joinUrl, type ClubPublic } from "@/lib/clubs";
import { useT } from "@/lib/i18n";

/** bottegarooms.com/join/[slug]/poster: print it, or show it on the screen before a screening. */
export function ClubPoster() {
  const t = useT();
  const { slug } = useParams<{ slug: string }>();
  const [club, setClub] = useState<ClubPublic | null | undefined>(undefined);
  useEffect(() => { clubPublic(slug.toLowerCase()).then(setClub).catch(() => setClub(null)); }, [slug]);
  const url = joinUrl(slug.toLowerCase());
  const svg = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    return qr.createSvgTag({ cellSize: 10, margin: 0, scalable: true });
  }, [url]);

  if (club === undefined) return null;
  if (club === null) return <p className="loading">{t("There's no club at this link.")}</p>;

  return (
    <div className="poster">
      <button type="button" className="btn poster-print" onClick={() => window.print()}>{t("Print")}</button>
      <div className="poster-sheet">
        <p className="poster-emoji" aria-hidden="true">{club.emoji}</p>
        <h1>{club.name}</h1>
        <p className="poster-lede">{t("Our club has a home on Bottega: the shelf of everything we've done together, a vote on what's next, our chat and our quiz.")}</p>
        <div className="poster-qr" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="poster-scan">{t("Scan with your phone camera to join")}</p>
        <p className="poster-url">{url.replace(/^https:\/\//, "")}</p>
        <p className="poster-foot">{t("No email needed to join. It takes a few seconds.")}</p>
      </div>
    </div>
  );
}
