"use client";

import qrcode from "qrcode-generator";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { friendlyError, supabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import type { Piece, Profile, Room } from "@/lib/types";
import { Gate } from "./gate";

/* eslint-disable @next/next/no-img-element -- covers printed on paper */

const MAX = 8;

/** /shelf-cards: print "staff pick" cards for the pieces in your room, to stand on a shelf or under a book. */
export function ShelfCardsRoute() {
  return <Gate>{(me) => <ShelfCards me={me} />}</Gate>;
}

function ShelfCards({ me }: { me: Profile }) {
  const t = useT();
  const [room, setRoom] = useState<Room | null>(null);
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [heading, setHeading] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabase();
    Promise.all([
      sb.from("rooms").select("*").eq("owner_id", me.id).maybeSingle(),
      sb.from("pieces").select("*").eq("owner_id", me.id).in("type", ["poster", "book", "song", "scene", "game"]).order("position"),
    ]).then(([{ data: r }, { data: p }]) => {
      const list = (p ?? []) as Piece[];
      setRoom(r as Room | null);
      setPieces(list);
      // Start with the pieces that have a cover and your words: those make the best cards.
      setPicked(list.filter((x) => x.cover_url && x.body.trim()).slice(0, 4).map((x) => x.id));
    });
  }, [me.id]);

  const url = `https://bottegarooms.com/r/${me.username}`;
  const qr = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(url);
    q.make();
    return q.createSvgTag({ cellSize: 10, margin: 0, scalable: true });
  }, [url]);

  if (!room || !pieces) return <p className="loading">{t("One moment…")}</p>;
  const label = heading.trim() || t("Our pick");
  const chosen = picked.map((id) => pieces.find((p) => p.id === id)).filter((p): p is Piece => Boolean(p));
  const sheets: Piece[][] = [];
  for (let i = 0; i < chosen.length; i += 4) sheets.push(chosen.slice(i, i + 4));

  function toggle(id: string) {
    setPicked((list) => list.includes(id) ? list.filter((x) => x !== id) : list.length >= MAX ? list : [...list, id]);
  }

  async function openDoor() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase().from("rooms").update({ visibility: "public" }).eq("owner_id", me.id);
    setBusy(false);
    if (err) return setError(friendlyError(err, t("Couldn't save that. Try again.")));
    track("made_public", { detail: "shelf-cards" });
    setRoom({ ...room!, visibility: "public" });
  }

  async function print() {
    track("share_link", { detail: `shelf-cards:${chosen.length}` });
    // Book covers can take a moment to arrive; print only once every cover is on the card.
    setBusy(true);
    const imgs = [...document.querySelectorAll<HTMLImageElement>(".talker img")];
    await Promise.race([
      Promise.all(imgs.map((i) => i.complete ? null : new Promise((done) => { i.onload = i.onerror = done; }))),
      new Promise((done) => setTimeout(done, 8000)),
    ]);
    setBusy(false);
    window.print();
  }

  return (
    <div className="talkers">
      <section className="talkers-setup">
        <p className="smallcaps">{t("Shelf cards")}</p>
        <h1>{t("Print your picks for the shelf.")}</h1>
        <p className="muted">{t("A card for each piece: the cover, your words, and a code that opens your room. Stand them on a shelf, tuck them under a book, or pin them by the till. Four to a page.")}</p>

        {room.visibility !== "public" && (
          <div className="talkers-warn">
            <p>{t("Your room is only open to friends, so people who scan a card would find the door closed.")}</p>
            <button className="btn small" type="button" disabled={busy} onClick={openDoor}>{busy ? t("One moment…") : t("Open my room to everyone")}</button>
            <p className="msg err" aria-live="polite">{error}</p>
          </div>
        )}

        <div className="field">
          <label htmlFor="talker-heading">{t("Words at the top of each card")}</label>
          <input id="talker-heading" type="text" maxLength={28} placeholder={t("Our pick")} value={heading} onChange={(e) => setHeading(e.target.value)} />
          <span className="hint">{t("For example: Staff pick, Cem recommends, Film of the month.")}</span>
        </div>

        <p className="field-label">{t("Pick up to {n} pieces ({k} chosen)", { n: MAX, k: chosen.length })}</p>
        {pieces.length === 0 ? (
          <p className="muted">{t("Hang a few things in your room first.")}</p>
        ) : (
          <ul className="talker-pick">
            {pieces.map((p) => (
              <li key={p.id}>
                <button type="button" aria-pressed={picked.includes(p.id)} onClick={() => toggle(p.id)}>
                  {p.cover_url ? <img src={p.cover_url} alt="" /> : <span className="noart" aria-hidden="true" />}
                  <span><b>{p.title}</b>{!p.body.trim() && <span className="muted"> · {t("no words yet")}</span>}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="row">
          <button className="btn" type="button" disabled={!chosen.length || busy} onClick={print}>{busy ? t("One moment…") : t("Print")}</button>
        </div>
        <p className="hint">{t("Print on thick paper or card, at 100% size, then cut along the lines.")}</p>
      </section>

      {sheets.map((sheet, s) => (
        <div className="talker-sheet" key={s}>
          {sheet.map((p) => (
            <article className="talker" key={p.id}>
              <p className="talker-head">{label}</p>
              {p.cover_url && (
                <div className="talker-frame"><img src={`/api/image?url=${encodeURIComponent(p.cover_url)}`} alt="" /></div>
              )}
              <h2>{p.title}</h2>
              {p.subtitle && <p className="talker-maker">{p.subtitle}</p>}
              {p.body.trim() && <p className="talker-why">“{firstLine(p.body)}”</p>}
              <div className="talker-foot">
                <div className="talker-qr" dangerouslySetInnerHTML={{ __html: qr }} />
                <p><b>{t("Step into our room")}</b><span>{t("Scan with your phone camera")}</span><span className="talker-url">bottegarooms.com/r/{me.username}</span></p>
              </div>
            </article>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The first sentence of the owner's words, short enough for a card. */
function firstLine(body: string): string {
  const text = body.trim().split(/\n/)[0] ?? "";
  const sentence = text.match(/^.*?[.!?…](\s|$)/)?.[0]?.trim() ?? text;
  return sentence.length > 160 ? `${sentence.slice(0, 157).trimEnd()}…` : sentence;
}
