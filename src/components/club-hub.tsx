"use client";

import { useT } from "@/lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  addToShelf, closePoll, openPoll, pollState, removeCoverPhoto, removeFromShelf, setClubCover, shelfOf, uploadClubCover, votePoll,
  type PollOption, type PollState, type ShelfItem, type ShelfKind,
} from "@/lib/clubs";
import { searchBooks, searchFilms, searchSongs, type Found } from "@/lib/lookup";
import { notifyClub } from "@/lib/push";
import { SearchPicker } from "./search-picker";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- covers from Apple Music, TMDB and Open Library */

/*
 * The club as a home: "What's next?" (the host puts up two to four choices, members vote) and the
 * shelf (everything the club has watched, read or listened to together).
 */

const KINDS: { kind: ShelfKind; label: string; search: typeof searchSongs; source: string; placeholder: string; by: string }[] = [
  { kind: "book", label: "Book", search: searchBooks, source: "Open Library & Apple Books", placeholder: "Title or author", by: "Author or publisher" },
  { kind: "film", label: "Film", search: searchFilms, source: "TMDB", placeholder: "Film or show", by: "Director · year" },
  { kind: "song", label: "Record", search: searchSongs, source: "Apple Music", placeholder: "Album, song or artist", by: "Artist" },
];

const toOption = (kind: ShelfKind, f: Found): PollOption =>
  ({ type: kind, title: f.title, subtitle: f.subtitle, cover_url: f.cover_url, link: f.link ?? null });

function Cover({ item, size = "m" }: { item: { type: ShelfKind; title: string; cover_url?: string | null }; size?: "s" | "m" }) {
  return (
    <span className={`hub-cover t-${item.type} ${size}`}>
      {item.cover_url ? <img src={item.cover_url} alt="" loading="lazy" /> : <span className="hub-cover-title">{item.title}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// What's next?
// ---------------------------------------------------------------------------

export function NextUp({ clubId, isHost, onShelved }: { clubId: string; isHost: boolean; onShelved: () => void }) {
  const t = useT();
  const [poll, setPoll] = useState<PollState | null | undefined>(undefined);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => setPoll(await pollState(clubId)), [clubId]);
  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open

  async function vote(i: number) {
    if (!poll || poll.closed_at || busy) return;
    setBusy(true);
    const err = await votePoll(poll.id, i);
    setBusy(false);
    setMsg(err);
    void load();
  }

  async function close() {
    if (!poll) return;
    setBusy(true);
    const err = await closePoll(poll.id, true);
    setBusy(false);
    setMsg(err);
    void load();
    if (!err) onShelved();
  }

  if (poll === undefined) return null;
  const open = poll && !poll.closed_at;
  const max = poll ? Math.max(1, ...poll.counts) : 1;
  const nothing = !open && !(poll && poll.winner != null);
  // Members don't see an empty vote; hosts get one quiet line to ask.
  if (nothing && !isHost) return null;

  return (
    <section className={`hub-section${nothing ? " hub-empty" : ""}`} id="next" aria-label="What's next">
      <div className="tonight-head">
        <h2>{open ? (poll.question === "What's next?" ? t("What's next?") : poll.question) : t("What's next?")}</h2>
        {isHost && !open && <button className="btn ghost small" type="button" onClick={() => setAsking(true)}>{t("Ask the club")}</button>}
      </div>

      {open ? (
        <>
          <div className="vote-options">
            {poll.options.map((o, i) => {
              const mine = poll.my_choice === i;
              return (
                <button key={i} type="button" className={`vote-option${mine ? " mine" : ""}`} disabled={busy} onClick={() => vote(i)}
                  aria-pressed={mine} aria-label={t("Vote for {title}", { title: o.title })}>
                  <Cover item={o} size="s" />
                  <span className="vote-text">
                    <b>{o.title}</b>
                    {o.subtitle && <span className="muted">{o.subtitle}</span>}
                    <span className="vote-bar" aria-hidden="true"><i style={{ width: `${(poll.counts[i] / max) * 100}%` }} /></span>
                  </span>
                  <span className="vote-count">{poll.counts[i]}</span>
                </button>
              );
            })}
          </div>
          <p className="muted vote-foot">
            {poll.my_choice == null ? t("Tap your pick. You can change it until the vote closes.") : t("Your vote is in. Tap another to change it.")}
            {" "}{poll.voters === 1 ? t("1 vote so far.") : t("{n} votes so far.", { n: poll.voters })}
          </p>
          {isHost && (
            <button className="btn ghost small" type="button" disabled={busy} onClick={close}>{t("Close the vote and shelve the winner")}</button>
          )}
        </>
      ) : poll && poll.winner != null ? (
        <p className="muted">{t("Last time the club picked")} <b className="ink">{poll.options[poll.winner]?.title}</b>.{isHost ? ` ${t("Ask again when you're ready for the next one.")}` : ""}</p>
      ) : null}
      <p className="msg err" aria-live="polite">{msg}</p>

      {asking && <AskSheet clubId={clubId} onClose={() => setAsking(false)} onDone={() => { setAsking(false); void load(); }} />}
    </section>
  );
}

function AskSheet({ clubId, onClose, onDone }: { clubId: string; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [kind, setKind] = useState<ShelfKind>("book");
  const [choices, setChoices] = useState<PollOption[]>([]);
  const [question, setQuestion] = useState(t("What's next?"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = KINDS.find((k) => k.kind === kind)!;

  async function ask() {
    setBusy(true);
    const err = await openPoll(clubId, choices, question.trim() || t("What's next?"));
    setBusy(false);
    if (err) return setError(err);
    void notifyClub(clubId, "poll");
    onDone();
  }

  return (
    <Sheet onClose={onClose} onSubmit={ask} label={t("Ask the club what's next")}>
      <h2>{t("Ask the club")}</h2>
      <div className="field">
        <label htmlFor="poll-q">{t("Question")}</label>
        <input id="poll-q" type="text" maxLength={80} value={question} onChange={(e) => setQuestion(e.target.value)} />
      </div>
      <div className="chips">
        {KINDS.map((k) => <button key={k.kind} type="button" className="chip" aria-pressed={kind === k.kind} onClick={() => setKind(k.kind)}>{t(k.label)}</button>)}
      </div>
      {choices.length < 4 && (
        <SearchPicker key={kind} id="poll-search" label={t("Add a {kind} ({n} of 4)", { kind: t(meta.label).toLocaleLowerCase(), n: choices.length })} placeholder={t(meta.placeholder)}
          source={meta.source} search={meta.search} manual={{ subtitle: t(meta.by) }}
          onPick={(f) => setChoices((c) => [...c, toOption(kind, f)].slice(0, 4))} />
      )}
      {choices.length > 0 && (
        <ul className="hub-picked">
          {choices.map((c, i) => (
            <li key={`${c.title}-${i}`}>
              <Cover item={c} size="s" />
              <span><b>{c.title}</b>{c.subtitle && <span className="muted"> · {c.subtitle}</span>}</span>
              <button type="button" className="btn ghost small" onClick={() => setChoices((all) => all.filter((_, j) => j !== i))} aria-label={t("Remove {title}", { title: c.title })}>{t("Remove")}</button>
            </li>
          ))}
        </ul>
      )}
      <p className="msg err">{error}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" type="submit" disabled={busy || choices.length < 2}>{busy ? t("Asking…") : choices.length < 2 ? t("Pick at least two") : t("Ask the club")}</button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// The shelf
// ---------------------------------------------------------------------------

export function ClubShelf({ clubId, me, isHost, refresh, startOpen = false }: { clubId: string; me: string; isHost: boolean; refresh: number; startOpen?: boolean }) {
  const t = useT();
  const [items, setItems] = useState<ShelfItem[] | null>(null);
  // A brand-new club opens straight into filling its shelf, so nobody ever lands in an empty club.
  const [adding, setAdding] = useState(startOpen && isHost);
  const [picked, setPicked] = useState<ShelfItem | null>(null);
  const [covering, setCovering] = useState<ShelfItem | null>(null);

  const load = useCallback(async () => setItems(await shelfOf(clubId)), [clubId]);
  useEffect(() => { void load(); }, [load, refresh]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open

  if (!items) return null;
  return (
    <section className="hub-section" id="shelf" aria-label={t("The club's shelf")}>
      <div className="tonight-head">
        <h2>{t("The shelf")}</h2>
        {isHost && <button className="btn ghost small" type="button" onClick={() => setAdding(true)}>{t("Add to the shelf")}</button>}
      </div>
      {items.length === 0 ? (
        isHost ? (
          <div className="shelf-start">
            <p><b>{t("Start with three.")}</b> {t("Add a few books or films you've already done together. It's the first thing new members see, and it shows them what the club is about.")}</p>
            <button className="btn" type="button" onClick={() => setAdding(true)}>{t("Add the first ones")}</button>
          </div>
        ) : (
          <p className="muted">{t("What the club has watched, read and listened to together will show up here.")}</p>
        )
      ) : (
        <ul className="hub-shelf">
          {items.map((it) => (
            <li key={it.id}>
              <button type="button" onClick={() => setPicked(it)} aria-label={`${it.title}${it.subtitle ? `, ${it.subtitle}` : ""}`}>
                <Cover item={it} />
                <span className="hub-shelf-title">{it.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && <AddSheet clubId={clubId} me={me} count={items.length} onAdded={() => void load()} onClose={() => { setAdding(false); void load(); }} />}
      {picked && (
        <Sheet onClose={() => setPicked(null)} label={picked.title}>
          <div className="hub-detail">
            <Cover item={picked} />
            <div>
              <p className="smallcaps muted">{picked.type === "song" ? t("Record") : picked.type === "film" ? t("Film") : t("Book")} · {t("on the shelf since {date}", { date: new Date(picked.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }) })}</p>
              <h2>{picked.title}</h2>
              {picked.subtitle && <p className="muted">{picked.subtitle}</p>}
              {picked.link && <p><a href={picked.link} target="_blank" rel="noopener noreferrer">{t("Open link")} ↗</a></p>}
            </div>
          </div>
          {isHost && (
            <div className="row">
              <button className="btn ghost" type="button" onClick={() => { setCovering(picked); setPicked(null); }}>{picked.cover_url ? t("Change the cover") : t("Add a cover")}</button>
              <button className="btn ghost danger-text" type="button" onClick={async () => { await removeFromShelf(picked.id); setPicked(null); void load(); }}>{t("Take it off the shelf")}</button>
            </div>
          )}
        </Sheet>
      )}
      {covering && <CoverSheet clubId={clubId} item={covering} onClose={() => setCovering(null)} onDone={() => { setCovering(null); void load(); }} />}
    </section>
  );
}

/** The words that make a title itself: no subtitle, no little words. */
const STOP = new Set(["the", "and", "for", "with", "from", "into", "that", "this", "les", "der", "die", "das"]);
const titleWords = (s: string) => new Set(
  s.split(/[:(]| [-–—] /)[0].toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 2 && !STOP.has(w)),
);
/** A found title belongs to this one when every word of either title's main part is in the other. */
function sameTitle(a: string, b: string): boolean {
  const inside = (x: Set<string>, whole: string) => x.size > 0 && [...x].every((w) => whole.toLowerCase().normalize("NFKD").includes(w));
  return inside(titleWords(a), b) || inside(titleWords(b), a);
}

/**
 * For hosts: a cover for something on the shelf. Covers the catalogues have for that title, or a photo of your own
 * copy (for small-press books nobody lists). It shows wherever the club sees the title, including the invitation.
 */
function CoverSheet({ clubId, item, onClose, onDone }: { clubId: string; item: ShelfItem; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [found, setFound] = useState<{ url: string; title: string; by: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const search = KINDS.find((k) => k.kind === item.type)!.search;
    const author = item.type === "book" ? item.subtitle.split("·")[0].trim() : "";
    const ctrl = new AbortController();
    // Only covers of this title (a search also brings back look-alikes), each cover once, not the one it has now.
    const covers = async (term: string) => {
      const seen = new Set<string>();
      return (await search(term, ctrl.signal))
        .filter((f) => f.cover_url && f.cover_url !== item.cover_url && sameTitle(f.title, item.title))
        .filter((f) => !seen.has(f.cover_url!) && seen.add(f.cover_url!))
        .map((f) => ({ url: f.cover_url!, title: f.title, by: f.subtitle }));
    };
    (async () => {
      // With the author first (fewer look-alikes), then the title alone.
      let list = author ? await covers(`${item.title} ${author}`) : [];
      if (!list.length) list = await covers(item.title);
      setFound(list.slice(0, 6));
    })().catch(() => { if (!ctrl.signal.aborted) setFound([]); });
    return () => ctrl.abort();
  }, [item]);

  async function pick(url: string) {
    setBusy(true);
    setError(null);
    const err = await setClubCover(clubId, item.title, url, item.cover_url);
    setBusy(false);
    if (err) return setError(t(err));
    onDone();
  }

  async function addPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    let url: string;
    try {
      url = await uploadClubCover(clubId, file);
    } catch {
      setBusy(false);
      return setError(t("That photo couldn't be added. Try a JPG or PNG."));
    }
    const err = await setClubCover(clubId, item.title, url, item.cover_url);
    setBusy(false);
    if (err) { await removeCoverPhoto(url); return setError(t(err)); }
    onDone();
  }

  return (
    <Sheet onClose={onClose} label={t("A cover for {title}", { title: item.title })}>
      <h2>{item.cover_url ? t("Change the cover") : t("Add a cover")}</h2>
      <p className="muted">{t("Pick one we found, or use a photo of your own copy. It shows wherever the club sees this title, including the invitation.")}</p>
      {found === null ? (
        <p className="muted">{t("Looking for covers…")}</p>
      ) : found.length > 0 ? (
        <div className="cover-picks" aria-label={t("Covers we found")}>
          {found.map((f) => (
            <button key={f.url} type="button" disabled={busy} onClick={() => void pick(f.url)} aria-label={`${t("Use this cover")}: ${f.title}${f.by ? `, ${f.by}` : ""}`}>
              <span className={`hub-cover t-${item.type} m`}><img src={f.url} alt="" loading="lazy" /></span>
              <span className="cover-pick-by">{f.by || f.title}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">{t("We couldn't find a cover for this one. A photo of your copy works well.")}</p>
      )}
      <input ref={photo} type="file" accept="image/*" hidden onChange={(e) => void addPhoto(e.target.files?.[0])} />
      <p className="msg err" aria-live="polite">{error}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" type="button" disabled={busy} onClick={() => photo.current?.click()}>{busy ? t("Adding the cover…") : t("Use a photo")}</button>
      </div>
    </Sheet>
  );
}

/** Add several things in a row: the sheet stays open and lists what went on, until Done. */
function AddSheet({ clubId, me, count, onAdded, onClose }: { clubId: string; me: string; count: number; onAdded: () => void; onClose: () => void }) {
  const t = useT();
  const [kind, setKind] = useState<ShelfKind>("book");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<PollOption[]>([]);
  const [round, setRound] = useState(0); // clears the search box after each pick
  const meta = KINDS.find((k) => k.kind === kind)!;
  // What was on the shelf when the sheet opened, plus what went on since (the shelf behind refreshes as you add).
  const [before] = useState(count);
  const total = before + added.length;

  async function pick(f: Found) {
    const item = toOption(kind, f);
    const err = await addToShelf(clubId, me, item);
    if (err) return setError(t(err));
    setError(null);
    setAdded((a) => [...a, item]);
    setRound((r) => r + 1);
    onAdded();
  }

  return (
    <Sheet onClose={onClose} label={t("Add to the shelf")}>
      <h2>{t("Add to the shelf")}</h2>
      <p className="muted">{total < 3 ? t("Add a few you've done together. {n} of 3 so far.", { n: total }) : t("Lovely. Add more, or tap Done.")}</p>
      <div className="chips">
        {KINDS.map((k) => <button key={k.kind} type="button" className="chip" aria-pressed={kind === k.kind} onClick={() => setKind(k.kind)}>{t(k.label)}</button>)}
      </div>
      <SearchPicker key={`${kind}-${round}`} id="shelf-search" label={t("Find a {kind}", { kind: t(meta.label).toLocaleLowerCase() })} placeholder={t(meta.placeholder)}
        source={meta.source} search={meta.search} manual={{ subtitle: t(meta.by) }} onPick={pick} />
      <p className="msg err">{error}</p>
      {added.length > 0 && (
        <ul className="hub-picked" aria-label={t("Just added")}>
          {added.map((c, i) => (
            <li key={`${c.title}-${i}`}>
              <Cover item={c} size="s" />
              <span><b>{c.title}</b>{c.subtitle && <span className="muted"> · {c.subtitle}</span>}</span>
              <span className="smallcaps muted">{t("On the shelf")}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="row"><button className="btn" type="button" onClick={onClose}>{t("Done")}</button></div>
    </Sheet>
  );
}
