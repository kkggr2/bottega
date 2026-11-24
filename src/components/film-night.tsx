"use client";

import qrcode from "qrcode-generator";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addToShelf, clubScores, joinClub, openRating, rateFilm, rateUrl, ratingLines, ratingOpen, shelfOf,
  type RatingLine, type RatingOpen, type Score, type ShelfItem,
} from "@/lib/clubs";
import { joinAsGuest } from "@/lib/guest";
import { useT } from "@/lib/i18n";
import { searchFilms, filmDetails, type Found } from "@/lib/lookup";
import { track } from "@/lib/track";
import { useAuth } from "./auth";
import { SearchPicker } from "./search-picker";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- film posters from TMDB */

/*
 * Film night: the paper rating slip, on a phone.
 *   The host opens rating for tonight's film (on the club's Now tab) and puts the club's QR code on the screen.
 *   One code for the whole season: bottegarooms.com/rate/<club> always opens whichever film is open.
 *   Members tap one to five stars, add a line if they like, and see the room's score at once.
 *   The club's shelf turns into the season's table, best first.
 */

function qrSvg(url: string, cell = 8): string {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  return qr.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}

const starLine = (n: number) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);

// ---------------------------------------------------------------------------
// The rate page: bottegarooms.com/rate/<club>
// ---------------------------------------------------------------------------

export function RateScreen({ slug }: { slug: string }) {
  const t = useT();
  const auth = useAuth();
  const [open, setOpen] = useState<RatingOpen | null | undefined>(undefined);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<RatingLine[]>([]);

  const load = useCallback(async () => {
    const o = await ratingOpen(slug);
    setOpen(o);
    if (o?.my_stars) { setStars(o.my_stars); setComment(o.my_comment ?? ""); }
    if (o?.item_id && o.is_member) setLines(await ratingLines(o.item_id));
  }, [slug]);
  // Reload once signed-in state settles, so members see their own rating and the score.
  useEffect(() => { if (auth.status !== "loading") void load(); }, [load, auth.status]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open

  const needsName = auth.status === "signedOut" || auth.status === "needsUsername";
  const rated = Boolean(open?.my_stars);

  async function send() {
    if (!open?.item_id || busy) return;
    if (!stars) return setError(t("Tap the stars first."));
    setBusy(true);
    setError(null);
    // Not in the club yet: in with just a name (or straight in, if they already have a room).
    if (!open.is_member) {
      const err = needsName ? await joinAsGuest(slug, name.trim().toLowerCase()) : await joinClub(slug, "rate");
      if (err) { setBusy(false); return setError(t(err)); }
      if (needsName) await auth.refreshProfile();
      track("club_join", { detail: `rate:${slug}` });
    }
    const err = await rateFilm(open.item_id, stars, comment);
    setBusy(false);
    if (err) return setError(t(err));
    await load();
  }

  if (open === undefined || auth.status === "loading") return <p className="loading">{t("Opening tonight's film…")}</p>;
  if (open === null) {
    return (
      <section className="rate">
        <h1>{t("There's no club at this link.")}</h1>
        <p className="muted">{t("Check the code on the screen, or ask at the desk.")}</p>
      </section>
    );
  }
  if (!open.item_id) {
    return (
      <section className="rate">
        <p className="rate-club"><span aria-hidden="true">{open.emoji}</span> {open.club_name}</p>
        <h1>{t("Nothing to rate just yet.")}</h1>
        <p className="muted">{t("Rating opens on film night. Come back after the film.")}</p>
        {open.is_member && <Link className="btn ghost" href={`/club/${slug}`}>{t("Open the club")}</Link>}
      </section>
    );
  }

  return (
    <section className="rate">
      <p className="rate-club"><span aria-hidden="true">{open.emoji}</span> {open.club_name}</p>
      <div className="rate-film">
        {open.cover_url ? <img src={open.cover_url} alt="" /> : <span className="rate-film-blank" aria-hidden="true">🎬</span>}
        <div>
          <p className="muted">{rated ? t("You rated") : t("How was it?")}</p>
          <h1>{open.title}</h1>
          {open.subtitle && <p className="muted">{open.subtitle}</p>}
        </div>
      </div>

      {rated && open.ratings ? (
        <div className="rate-result" aria-live="polite">
          <p className="rate-average"><b>{Number(open.average).toFixed(1)}</b> <span aria-hidden="true">★</span></p>
          <p>{open.ratings === 1 ? t("from 1 member so far") : t("from {n} members so far", { n: open.ratings })}</p>
          <p className="rate-note">{t("Thank you. You can change your rating until the next film night.")}</p>
        </div>
      ) : null}

      <form className="rate-form" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <p className="rate-step">{t("Tap a star: 1 = not for me, 5 = loved it.")}</p>
        <div className="rate-stars" role="radiogroup" aria-label={t("Your rating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={t("{n} of 5", { n })}
              className={n <= stars ? "on" : ""} onClick={() => setStars(n)}>★</button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="rate-line">{t("A line about it (optional)")}</label>
          <input id="rate-line" type="text" maxLength={280} value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder={t("The ending stayed with me")} />
        </div>
        {needsName && !open.is_member && (
          <div className="field">
            <label htmlFor="rate-name">{t("Your name in the club")}</label>
            <input id="rate-name" type="text" autoCapitalize="none" autoCorrect="off" maxLength={20} value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "_"))} placeholder="margaret_k" />
            <span className="hint">{t("3–20 lowercase letters, numbers or underscores. No email needed.")}</span>
          </div>
        )}
        <p className="msg err" aria-live="polite">{error}</p>
        <button className="btn" type="submit" disabled={busy || !stars}>
          {busy ? t("Sending…") : rated ? t("Change my rating") : t("Send my rating")}
        </button>
      </form>

      {lines.length > 0 && (
        <section className="rate-lines" aria-label={t("What members said")}>
          <h2>{t("What members said")}</h2>
          <ul>
            {lines.map((l, i) => (
              <li key={i}><span className="rate-line-stars" aria-label={t("{n} of 5", { n: l.stars })}>{starLine(l.stars)}</span> {l.comment} <span className="muted">@{l.username}</span></li>
            ))}
          </ul>
        </section>
      )}

      {open.is_member && <Link className="linkish rate-club-link" href={`/club/${slug}`}>{t("Open the club")} →</Link>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// The screen slide: bottegarooms.com/rate/<club>/screen, for the projector or a print-out at the desk
// ---------------------------------------------------------------------------

export function RateSlide({ slug }: { slug: string }) {
  const t = useT();
  const [open, setOpen] = useState<RatingOpen | null | undefined>(undefined);
  const url = rateUrl(slug);
  const svg = useMemo(() => qrSvg(url, 10), [url]);
  useEffect(() => { ratingOpen(slug).then(setOpen).catch(() => setOpen(null)); }, [slug]);

  if (open === undefined) return null;
  return (
    <div className="rate-slide">
      <div className="rate-slide-text">
        <p className="rate-slide-club">{open?.emoji} {open?.club_name ?? ""}</p>
        <h1>{open?.title ? t("How was {film}?", { film: open.title }) : t("Rate tonight's film")}</h1>
        <p>{t("Point your phone's camera at the code. One to five stars, and a line if you like.")}</p>
        <p className="rate-slide-url">{url.replace(/^https:\/\//, "")}</p>
      </div>
      <div className="rate-slide-qr" dangerouslySetInnerHTML={{ __html: svg }} aria-label={t("QR code for {url}", { url })} role="img" />
      <button className="btn ghost small rate-slide-print" type="button" onClick={() => window.print()}>{t("Print")}</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// In the club: the film-night card on Now, and the season's table on Shelf
// ---------------------------------------------------------------------------

export function FilmNight({ clubId, slug, me, isHost, refresh = 0, onChanged }: {
  clubId: string; slug: string; me: string; isHost: boolean; refresh?: number; onChanged?: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState<RatingOpen | null | undefined>(undefined);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => setOpen(await ratingOpen(slug)), [slug]);
  useEffect(() => { void load(); }, [load, refresh]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open

  if (open === undefined || open === null) return null;
  // Members only see it while a film is open; hosts get one quiet line to start it.
  if (!open.item_id && !isHost) return null;

  return (
    <section className={`hub-section film-night${open.item_id ? "" : " hub-empty"}`} aria-label={t("Film night")}>
      <div className="tonight-head">
        <h2>{open.item_id ? t("Rate tonight's film") : t("Ratings on film night")}</h2>
        {isHost && <button className="btn ghost small" type="button" onClick={() => setPicking(true)}>{open.item_id ? t("Change") : t("Set up")}</button>}
      </div>
      {!open.item_id && isHost && (
        <p className="film-night-hint">{t("On film night: pick the film, show the club's code on screen, and members rate it from their seats. Scores build up on the Shelf.")}</p>
      )}
      {open.item_id && (
        <>
          <Link className="film-night-film" href={`/rate/${slug}`}>
            {open.cover_url && <img src={open.cover_url} alt="" />}
            <span>
              <b>{open.title}</b>
              <span className="muted">
                {open.ratings ? `${Number(open.average).toFixed(1)} ★ · ${open.ratings === 1 ? t("1 rating") : t("{n} ratings", { n: open.ratings })}` : t("No ratings yet")}
              </span>
              <span className="film-night-go">{open.my_stars ? `${t("You gave it")} ${starLine(open.my_stars)}` : t("Tap to rate")}</span>
            </span>
          </Link>
          {isHost && (
            <div className="film-night-host">
              <Link className="btn small" href={`/rate/${slug}/screen`} target="_blank">{t("Show the code on screen")}</Link>
              <p>{t("The same code works all season. It always opens the film you've picked here.")}</p>
            </div>
          )}
        </>
      )}
      {picking && (
        <PickFilmSheet clubId={clubId} me={me} current={open.item_id} onClose={() => setPicking(false)}
          onDone={() => { setPicking(false); void load(); onChanged?.(); }} />
      )}
    </section>
  );
}

function PickFilmSheet({ clubId, me, current, onClose, onDone }: {
  clubId: string; me: string; current: string | null; onClose: () => void; onDone: () => void;
}) {
  const t = useT();
  const [films, setFilms] = useState<ShelfItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => { shelfOf(clubId).then((all) => setFilms(all.filter((s) => s.type === "film"))).catch(() => setFilms([])); }, [clubId]);

  async function choose(id: string | null) {
    setBusy(true);
    const err = await openRating(clubId, id);
    setBusy(false);
    if (err) return setError(t(err));
    onDone();
  }

  // A film that isn't on the shelf yet (tonight's): add it, then open it.
  async function addAndOpen(f: Found) {
    setBusy(true);
    let subtitle = f.subtitle;
    try { const d = await filmDetails(f.id); subtitle = d.subtitle || subtitle; } catch {}
    const err = await addToShelf(clubId, me, { type: "film", title: f.title, subtitle, cover_url: f.cover_url, link: f.link ?? null });
    if (err) { setBusy(false); return setError(t(err)); }
    const fresh = await shelfOf(clubId);
    const added = fresh.find((s) => s.type === "film" && s.title === f.title.slice(0, 120));
    setBusy(false);
    if (added) await choose(added.id);
  }

  return (
    <Sheet onClose={onClose} label={t("Which film are we rating?")}>
      <h2>{t("Which film are we rating?")}</h2>
      <p className="sheet-hint">{t("Pick tonight's film. Members rate it from the code on the screen; you can switch to the next film next week.")}</p>
      {adding ? (
        <SearchPicker id="night-film" label={t("Find tonight's film")} placeholder={t("Film title")} search={searchFilms}
          source={t("Results from TMDB")} onPick={(f) => void addAndOpen(f)} />
      ) : (
        <>
          <button className="btn" type="button" disabled={busy} onClick={() => setAdding(true)}>{t("Tonight's film isn't on the shelf yet")}</button>
          {films && films.length > 0 && (
            <ul className="pick-film" aria-label={t("Films on the shelf")}>
              {films.map((f) => (
                <li key={f.id}>
                  <button type="button" disabled={busy} aria-pressed={f.id === current} onClick={() => choose(f.id)}>
                    {f.cover_url && <img src={f.cover_url} alt="" loading="lazy" />}
                    <span><b>{f.title}</b><span className="muted">{f.subtitle}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <p className="msg err" aria-live="polite">{error}</p>
      <div className="row">
        {current && <button className="btn ghost" type="button" disabled={busy} onClick={() => choose(null)}>{t("Close rating")}</button>}
        <button className="btn ghost" type="button" onClick={onClose}>{t("Close")}</button>
      </div>
    </Sheet>
  );
}

/** The season's table: rated films, best first. Nothing until the first rating. */
export function SeasonScores({ clubId, refresh = 0 }: { clubId: string; refresh?: number }) {
  const t = useT();
  const [scores, setScores] = useState<Score[]>([]);
  useEffect(() => { clubScores(clubId).then(setScores).catch(() => {}); }, [clubId, refresh]);
  if (!scores.length) return null;
  return (
    <section className="hub-section season-scores" aria-label={t("Members' scores")}>
      <h2>{t("Members' scores")}</h2>
      <p className="season-hint">{t("This season's films, best rated first. The small number is how many members rated it.")}</p>
      <ol>
        {scores.map((s) => (
          <li key={s.item_id}>
            {s.cover_url ? <img src={s.cover_url} alt="" loading="lazy" /> : <span className="season-blank" aria-hidden="true" />}
            <span className="season-title"><b>{s.title}</b><span className="muted">{s.subtitle}</span></span>
            <span className="season-score"><b>{Number(s.average).toFixed(1)}</b> ★<span className="muted">{s.ratings}</span></span>
          </li>
        ))}
      </ol>
    </section>
  );
}
