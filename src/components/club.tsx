"use client";

import { useT } from "@/lib/i18n";
import { useRemembered } from "@/lib/remember";
import qrcode from "qrcode-generator";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  APP_STORE, bannedFrom, clubMuted, setClubMuted, clubPublic, clubStats, createClub, deleteClub, isOwner, joinClub, leaveClub, makeHost, joinUrl, myClubs, rememberClub, rememberInvite,
  removeMember, roster, setCohost, shelfPreview, slugify, unban,
  type Banned, type ClubPublic, type ClubStats, type MyClub, type RosterRow,
} from "@/lib/clubs";
import { befriend } from "@/lib/friends";
import { isNativeApp, shareLink } from "@/lib/native";
import type { ClubQuizCard } from "@/lib/quiz/types";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import type { Profile } from "@/lib/types";
import { useAuth } from "./auth";
import { GuestNote } from "./guest";
import { joinAsGuest } from "@/lib/guest";
import { USERNAME } from "@/lib/themes";
import { ChatLog } from "./chat";
import { ClubShelf, NextUp } from "./club-hub";
import { SALON, usePalette } from "@/lib/room-colors";
import { Gate } from "./gate";
import { Sheet } from "./sheet";
import { ClubMeeting, ClubReading } from "./club-life";
import { PushAsk } from "./push-ask";
import { notifyClub } from "@/lib/push";

/* eslint-disable @next/next/no-img-element -- club shelf covers from Apple Music, TMDB and Open Library */

/*
 * Clubs. A host starts one and shares its link (bottegarooms.com/join/gray-fox) or QR code.
 * Joining connects you with the host, shows you everyone else to swap keys with,
 * and opens a club chat that stays open (messages last a week).
 */

// ---------------------------------------------------------------------------
// The join page: open to anyone, signed in or not.
// ---------------------------------------------------------------------------

export function JoinScreen({ slug }: { slug: string }) {
  const auth = useAuth();
  const router = useRouter();
  const t = useT();
  const [club, setClub] = useState<ClubPublic | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const signedIn = auth.status === "ready";

  // No account yet: in with just a name, as a guest. They can add an email later and keep everything.
  async function joinGuest() {
    if (!club) return;
    if (!USERNAME.test(name)) return setError(t("Pick a name: 3–20 lowercase letters, numbers or underscores."));
    setBusy(true);
    setError(null);
    const err = await joinAsGuest(club.slug, name);
    if (err) { setBusy(false); return setError(t(err)); }
    await auth.refreshProfile();
    router.push(`/club/${club.slug}`);
  }

  const [shelf, setShelf] = useState<Awaited<ReturnType<typeof shelfPreview>>>([]);
  useEffect(() => {
    clubPublic(slug).then((c) => {
      setClub(c);
      if (c) track("club_view", { detail: c.slug });
    }).catch(() => setClub(null));
    shelfPreview(slug).then(setShelf).catch(() => {});
  }, [slug]);

  // Not signed in: remember the club here and on the server (for an App Store install), before they leave.
  useEffect(() => {
    if (!club || auth.status === "loading" || signedIn) return;
    rememberClub(club.slug);
    rememberInvite({ club: club.slug });
  }, [club, auth.status, signedIn]);

  async function join() {
    if (!club) return;
    setBusy(true);
    const err = await joinClub(club.slug, "link");
    setBusy(false);
    if (err) return setError(err);
    track("club_join", { detail: club.slug });
    router.push(`/club/${club.slug}`);
  }

  if (club === undefined) return <p className="loading">{t("Finding the club…")}</p>;
  if (club === null) {
    return (
      <section className="join">
        <h1>{t("There's no club at this link.")}</h1>
        <p className="muted">{t("Check the link with whoever sent it, or")} <Link href="/">{t("make your own room")}</Link>.</p>
      </section>
    );
  }

  const iphoneBrowser = typeof navigator !== "undefined" && /iPhone|iPad/.test(navigator.userAgent) && !isNativeApp();

  return (
    <section className="join">
      <p className="join-emoji" aria-hidden="true">{club.emoji}</p>
      <p className="mono muted">{t("You're invited")}</p>
      <h1>{club.name}</h1>
      <p className="lede">
        {t("@{host} started this club's home on Bottega: what you've read and watched together, a vote on what's next, the club's own chat and quizzes. Everyone also gets a room for the films, books and records they love.", { host: club.host_username })}
      </p>
      <p className="muted">{club.members === 1 ? t("1 person is in so far.") : t("{n} people are in so far.", { n: club.members })}</p>
      {shelf.length > 0 && (
        <div className="join-shelf" aria-label={t("On the club's shelf")}>
          <p className="smallcaps muted">{t("On the club's shelf")}</p>
          <div>
            {shelf.map((s, i) => (
              <span key={i} className={`hub-cover t-${s.type} s`} title={s.title}>
                {s.cover_url ? <img src={s.cover_url} alt={s.title} loading="lazy" /> : <span className="hub-cover-title">{s.title}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      {signedIn ? (
        <button className="btn big" type="button" disabled={busy} onClick={join}>{busy ? t("Joining…") : t("Join {club}", { club: club.name })}</button>
      ) : (
        <div className="join-actions">
          <form className="guest-join" onSubmit={(e) => { e.preventDefault(); void joinGuest(); }}>
            <label htmlFor="guest-name" className="smallcaps muted">{t("Pick a name and come in")}</label>
            <div className="guest-row">
              <div className="at">
                <input id="guest-name" type="text" enterKeyHint="go" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
                  maxLength={20} placeholder={t("yourname")} value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
              </div>
              <button className="btn big" type="submit" disabled={busy}>{busy ? t("Coming in…") : t("Join")}</button>
            </div>
            <p className="hint">{t("No email needed to look around, vote and play. Add one later to keep your place.")}</p>
          </form>
          <p className="join-or muted">
            {t("Already on Bottega?")} <Link href="/">{t("Log in")}</Link>
            {iphoneBrowser && <> · <a href={APP_STORE}>{t("Get the iPhone app")}</a></>}
          </p>
        </div>
      )}
      <p className="msg err">{error}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The club page: for members.
// ---------------------------------------------------------------------------

/** /club/[slug], with the slug read on the client. */
export function ClubRoute() {
  const { slug } = useParams<{ slug: string }>();
  return <ClubScreen slug={slug.toLowerCase()} />;
}

export function ClubScreen({ slug }: { slug: string }) {
  return <Gate>{(me) => <ClubView me={me} slug={slug} />}</Gate>;
}

export function ClubView({ me, slug }: { me: Profile; slug: string }) {
  const t = useT();
  const isNew = useSearchParams().get("new") === "1";
  usePalette(SALON, "salon");
  const [club, setClub] = useState<MyClub | null | undefined>(undefined);
  const [people, setPeople] = useState<RosterRow[]>([]);
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [shelfTick, setShelfTick] = useState(0);

  const load = useCallback(async () => {
    const mine = (await myClubs()).find((c) => c.slug === slug) ?? null;
    setClub(mine);
    if (!mine) return;
    const [r, s] = await Promise.all([roster(mine.id), mine.is_host ? clubStats(mine.id) : Promise.resolve(null)]);
    setPeople(r);
    setStats(s);
  }, [slug]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open

  async function swap(row: RosterRow) {
    setBusy(true);
    try { await befriend(me.id, row.user_id); } catch {}
    setBusy(false);
    void load();
  }

  async function swapAll() {
    const others = people.filter((p) => p.relation === "none" || p.relation === "asking");
    setBusy(true);
    for (const p of others) { try { await befriend(me.id, p.user_id); } catch {} }
    setBusy(false);
    setNote(others.length ? (others.length === 1 ? t("Asked 1 person to swap keys.") : t("Asked {n} people to swap keys.", { n: others.length })) : t("You've already swapped keys with everyone."));
    void load();
  }

  if (club === undefined) return <p className="loading">{t("Opening the club…")}</p>;
  if (club === null) {
    return (
      <section className="chat">
        <Link href="/salon" className="mono muted back">&larr; {t("Salon")}</Link>
        <h1>{t("You're not in this club yet.")}</h1>
        <Link className="btn" href={`/join/${slug}`}>{t("See the invitation")}</Link>
      </section>
    );
  }

  const label: Record<RosterRow["relation"], string> = { me: t("You"), friends: t("Keys swapped"), asked: t("Asked"), asking: t("Accept"), none: t("Swap keys") };
  const canSwap = people.some((p) => p.relation === "none" || p.relation === "asking");

  return (
    <section className="chat club">
      <Link href="/salon" className="mono muted back">&larr; {t("Salon")}</Link>
      <p className="join-emoji small" aria-hidden="true">{club.emoji}</p>
      <h1>{club.name}</h1>
      <GuestNote />
      <div className="row club-actions">
        <button className="btn" type="button" onClick={() => setSharing(true)}>{t("Invite people")}</button>
        {canSwap && <button className="btn ghost" type="button" disabled={busy} onClick={swapAll}>{t("Swap keys with everyone")}</button>}
      </div>
      <p className="msg ok" aria-live="polite">{note}</p>

      {stats && stats.members > 0 && (
        <div className="club-stats" aria-label={t("How the link is doing")}>
          <span><b>{stats.members}</b> {t("joined")}</span>
          <span><b>{stats.joined_7d}</b> {t("this week")}</span>
          <span><b>{stats.came_back}</b> {t("came back")}</span>
          <span><b>{stats.active_7d}</b> {t("active this week")}</span>
        </div>
      )}

      {club.is_host && <FirstSteps club={club} onInvite={() => setSharing(true)} />}

      <PushAsk userId={me.id} text={t("Get a nudge when {club} posts, votes or meets.", { club: club.name })} />

      <ClubMeeting clubId={club.id} clubName={club.name} me={me.id} isHost={club.is_host} />

      <ClubReading clubId={club.id} me={me.id} isHost={club.is_host} people={people} onShelved={() => setShelfTick((n) => n + 1)} />

      <NextUp clubId={club.id} isHost={club.is_host} onShelved={() => setShelfTick((n) => n + 1)} />

      <ClubQuizzes slug={club.slug} />

      <ClubShelf clubId={club.id} me={me.id} isHost={club.is_host} refresh={shelfTick} startOpen={isNew} />

      <h2 className="thread-h">{t("Members")}</h2>
      <ul className="roster">
        {people.map((p) => (
          <li key={p.user_id}>
            <Link href={`/r/${p.username}`}>
              <b>@{p.username}</b>{p.is_host ? <span className="mono muted"> {t("host")}</span> : p.role === "cohost" ? <span className="mono muted"> {t("co-host")}</span> : null}
              {p.now_title && <span className="muted"> · {p.now_title}</span>}
            </Link>
            {p.relation === "none" || p.relation === "asking"
              ? <button className="btn small" type="button" disabled={busy} onClick={() => swap(p)}>{label[p.relation]}</button>
              : <span className="mono muted">{label[p.relation]}</span>}
          </li>
        ))}
      </ul>

      <h2 className="thread-h">{t("Club chat")}</h2>
      <p className="muted">{t("Only members can read it. Messages last a week.")}</p>
      <ChatLog me={me} roomKey={`club:${club.slug}`} people={people.map((p) => ({ user_id: p.user_id, username: p.username, title: p.now_title }))}
        placeholder={t("Write to {club}…", { club: club.name })} empty={t("Nobody has written yet. Say hello, or ask what everyone's into this week.")}
        canModerate={club.is_host} onSent={() => void notifyClub(club.id, "message")} />

      <ClubSettings club={club} me={me} people={people} onChanged={load} />

      {sharing && <InviteSheet club={club} onClose={() => setSharing(false)} />}
    </section>
  );
}

/** For a new club's host: four first steps, until they're done with it. */
function FirstSteps({ club, onInvite }: { club: MyClub; onInvite: () => void }) {
  const t = useT();
  const key = `bottega.firstSteps.${club.slug}`;
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try { setHidden(localStorage.getItem(key) === "done"); } catch { setHidden(false); } // eslint-disable-line react-hooks/set-state-in-effect -- reading a saved preference once
  }, [key]);
  if (hidden || club.members > 5) return null;
  const quizMail = `mailto:hello@bottegarooms.com?subject=${encodeURIComponent(`A quiz for ${club.name}`)}&body=${encodeURIComponent(
    `Hi Çağla,\n\nWe'd love a quiz for ${club.name} (${joinUrl(club.slug)}).\n\nTheme (our next book or film, a director, an author…): \n\nAnything we love or joke about: \n`)}`;
  const done = () => { try { localStorage.setItem(key, "done"); } catch {} setHidden(true); };
  return (
    <section className="first-steps" aria-label={t("First steps")}>
      <div className="tonight-head">
        <h2>{t("Your club is ready")}</h2>
        <button type="button" className="btn ghost small" onClick={done}>{t("Done")}</button>
      </div>
      <ol>
        <li><button type="button" className="linkish" onClick={onInvite}>{t("Invite your members")}</button><span>{t("One link, or a QR code for your next meeting.")}</span></li>
        <li><a href="#shelf" className="linkish">{t("Fill the shelf")}</a><span>{t("Add a few books or films you've done together.")}</span></li>
        <li><a href="#next" className="linkish">{t("Ask what's next")}</a><span>{t("Put up two to four choices and let everyone vote.")}</span></li>
        <li><a href={quizMail} className="linkish">{t("Ask for your club's quiz")}</a><span>{t("Tell us your theme; your quiz appears here, usually within a day.")}</span></li>
      </ol>
    </section>
  );
}

/** The club's own quizzes: one try each, with a high score table only the club sees. */
function ClubQuizzes({ slug }: { slug: string }) {
  const t = useT();
  const [quizzes, setQuizzes] = useState<ClubQuizCard[] | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase().auth.getSession();
      const res = await fetch(`/api/quiz?club=${encodeURIComponent(slug)}`, {
        headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}, cache: "no-store",
      });
      setQuizzes(res.ok ? ((await res.json()) as ClubQuizCard[]) : []);
    })().catch(() => setQuizzes([]));
  }, [slug]);
  if (!quizzes?.length) return null;
  return (
    <>
      <h2 className="thread-h">{t("Club quizzes")}</h2>
      <div className="club-quizzes">
        {quizzes.map((q) => (
          <Link key={q.id} href={`/club/${slug}/quiz/${q.id}`} className={`quiz-card${q.mine?.done ? " played" : ""}`}>
            <span className="mono">{q.mine?.done ? t("Played") : q.mine ? t("Started") : t("New")}</span>
            <b>{q.title}</b>
            <span className="muted">
              {q.mine?.done
                ? `${t("{score} points · {correct} of {count} right", { score: q.mine.score, correct: q.mine.correct, count: q.count })}${q.played > 1 ? ` · ${t("{n} played", { n: q.played })}` : ""}`
                : `${q.blurb.replace(/[.!?]$/, "")} · ${t("{n} questions", { n: q.count })}${q.played ? ` · ${t("{n} played", { n: q.played })}` : ""}`}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}

/** The club's link and QR code, for messages, posters and the screen at a screening. */
function InviteSheet({ club, onClose }: { club: MyClub; onClose: () => void }) {
  const t = useT();
  const url = joinUrl(club.slug);
  const [msg, setMsg] = useState<string | null>(null);
  const svg = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }, [url]);

  async function share() {
    const result = await shareLink(t("Join {club} on Bottega", { club: club.name }), url);
    if (result === "copied") setMsg(t("Link copied."));
    else if (result === "failed") setMsg(t("Couldn't share. The link is {url}", { url }));
  }

  return (
    <Sheet onClose={onClose} label={t("Invite people")}>
      <h2>{t("Invite people to {club}", { club: club.name })}</h2>
      <div className="club-qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="club-link">{url.replace(/^https:\/\//, "")}</p>
      <p className="hint">{t("Anyone who joins is connected with the host straight away. Show the code at a screening, or send the link.")}</p>
      <p className="msg ok">{msg}</p>
      <div className="row">
        <a className="btn ghost" href={`/join/${club.slug}/poster`} target="_blank" rel="noopener">{t("Poster to print")}</a>
        <button className="btn" type="button" onClick={share}>{t("Share link")}</button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// In the library: your clubs, and starting one.
// ---------------------------------------------------------------------------

export function ClubsSection() {
  const t = useT();
  const router = useRouter();
  const { userId } = useAuth();
  const [clubs, setClubs] = useRemembered<MyClub[] | null>(userId ? `clubs:${userId}` : null, null);
  const [starting, setStarting] = useState(false);
  useEffect(() => { myClubs().then(setClubs).catch(() => setClubs([])); }, [setClubs]);
  if (!clubs) return null;
  return (
    <section className="tonight" aria-label={t("Your clubs")}>
      <div className="tonight-head">
        <h2>{t("Clubs")}</h2>
        <button className="btn ghost small" type="button" onClick={() => setStarting(true)}>{t("Start a club")}</button>
      </div>
      {clubs.length === 0 ? (
        <p className="muted">{t("Run a film club, a book club, or a group chat of friends? Start a club and share one link: everyone who joins lands in the same place.")}</p>
      ) : (
        <div className="tonight-list">
          {clubs.map((c) => (
            <Link key={c.id} href={`/club/${c.slug}`} className="tonight-room">
              <span className="mono">{c.is_host ? t("Your club") : t("Club")}</span>
              <b>{c.emoji} {c.name}</b>
              <span className="muted">{c.members === 1 ? t("1 member") : t("{n} members", { n: c.members })}{c.messages ? ` · ${t("{n} new today", { n: c.messages })}` : ""}</span>
            </Link>
          ))}
        </div>
      )}
      {starting && <StartClubSheet onClose={() => setStarting(false)} onDone={(slug) => router.push(`/club/${slug}?new=1`)} />}
    </section>
  );
}

const EMOJI = ["🎬", "📚", "🎞️", "💿", "🎷", "🍿", "🌙", "☕"];

/** The fields for starting a club: name, link and sign. Shared by the sheet in the Salon and the start page. */
function useClubForm(onDone: (slug: string) => void) {
  const t = useT();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [emoji, setEmoji] = useState(EMOJI[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = slugTouched ? slug : slugify(name);
  const ready = name.trim().length >= 2 && link.length >= 3;

  async function start() {
    if (!ready || busy) return;
    setBusy(true);
    const err = await createClub(link, name, emoji);
    setBusy(false);
    if (err) return setError(t(err));
    track("club_create", { detail: link });
    onDone(link);
  }

  const fields = (
    <>
      <div className="field">
        <label htmlFor="club-name">{t("Your club's name")}</label>
        <input id="club-name" type="text" maxLength={60} placeholder={t("Gray Fox Book Club")} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="club-slug">{t("Its link")}</label>
        <div className="link-field"><span>bottegarooms.com/join/</span>
          <input id="club-slug" type="text" maxLength={40} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={link}
            onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }} />
        </div>
      </div>
      <div className="field">
        <span className="label">{t("Its sign")}</span>
        <div className="chips">
          {EMOJI.map((e) => <button key={e} type="button" className="chip" aria-pressed={emoji === e} onClick={() => setEmoji(e)}>{e}</button>)}
        </div>
      </div>
      <p className="msg err">{error}</p>
    </>
  );
  return { fields, start, busy, ready };
}

function StartClubSheet({ onClose, onDone }: { onClose: () => void; onDone: (slug: string) => void }) {
  const form = useClubForm(onDone);
  const t = useT();
  return (
    <Sheet onClose={onClose} onSubmit={form.start} label={t("Start a club")}>
      <h2>{t("Start a club")}</h2>
      {form.fields}
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" type="submit" disabled={form.busy || !form.ready}>{form.busy ? t("Starting…") : t("Start the club")}</button>
      </div>
    </Sheet>
  );
}

/** The same form on a page of its own (bottegarooms.com/start). */
export function StartClubForm({ onDone }: { onDone: (slug: string) => void }) {
  const form = useClubForm(onDone);
  const t = useT();
  return (
    <form className="panel stack" onSubmit={(e) => { e.preventDefault(); void form.start(); }}>
      {form.fields}
      <button className="btn big" type="submit" disabled={form.busy || !form.ready}>{form.busy ? t("Starting…") : t("Start the club")}</button>
    </form>
  );
}

/** At the bottom of a club: hosts manage members; the owner can hand it over or delete it; everyone else can leave. */
function ClubSettings({ club, me, people, onChanged }: { club: MyClub; me: Profile; people: RosterRow[]; onChanged: () => void }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState<"none" | "host" | "delete" | "leave" | "members">("none");
  const owner = isOwner(club);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const others = people.filter((p) => p.user_id !== me.id);
  const close = () => { setOpen("none"); setError(null); setPick(""); };

  async function run(task: () => Promise<string | null>, after: () => void) {
    setBusy(true);
    setError(null);
    const err = await task();
    setBusy(false);
    if (err) return setError(t(err));
    after();
  }

  return (
    <div className="club-settings">
      <MuteSwitch clubId={club.id} />
      {club.is_host && <button type="button" className="linkish" onClick={() => setOpen("members")}>{t("Manage members")}</button>}
      {owner ? (
        <>
          {others.length > 0 && <button type="button" className="linkish" onClick={() => setOpen("host")}>{t("Hand the club to someone else")}</button>}
          <button type="button" className="linkish danger-text" onClick={() => setOpen("delete")}>{t("Delete the club")}</button>
        </>
      ) : (
        <button type="button" className="linkish" onClick={() => setOpen("leave")}>{t("Leave the club")}</button>
      )}

      {open === "members" && <MembersSheet club={club} people={others} owner={owner} onClose={close} onChanged={onChanged} />}

      {open === "host" && (
        <Sheet onClose={close} label={t("Hand the club to someone else")}>
          <h2>{t("Who should host {club}?", { club: club.name })}</h2>
          <p className="muted">{t("They can then invite people, fill the shelf, ask what's next and see the club's numbers. You stay in the club as a member.")}</p>
          <div className="host-pick" role="radiogroup" aria-label={t("Members")}>
            {others.map((p) => (
              <label key={p.user_id} className="check">
                <input type="radio" name="new-host" value={p.user_id} checked={pick === p.user_id} onChange={() => setPick(p.user_id)} />
                <span>@{p.username}</span>
              </label>
            ))}
          </div>
          <p className="msg err" aria-live="polite">{error}</p>
          <div className="row">
            <button className="btn ghost" type="button" onClick={close}>{t("Cancel")}</button>
            <button className="btn" type="button" disabled={busy || !pick} onClick={() => run(() => makeHost(club.id, pick), () => { close(); onChanged(); })}>
              {busy ? t("One moment…") : t("Make them the host")}
            </button>
          </div>
        </Sheet>
      )}

      {open === "delete" && (
        <Sheet onClose={close} label={t("Delete the club")}>
          <h2>{t("Delete {club}?", { club: club.name })}</h2>
          <p>{t("The club's shelf, votes, quiz scores and chat are deleted for everyone, and the invite link stops working. This can't be undone.")}</p>
          <p className="msg err" aria-live="polite">{error}</p>
          <div className="row">
            <button className="btn ghost" type="button" onClick={close}>{t("Cancel")}</button>
            <button className="btn danger-solid" type="button" disabled={busy} onClick={() => run(() => deleteClub(club.id), () => router.push("/salon"))}>
              {busy ? t("Deleting…") : t("Delete the club")}
            </button>
          </div>
        </Sheet>
      )}

      {open === "leave" && (
        <Sheet onClose={close} label={t("Leave the club")}>
          <h2>{t("Leave {club}?", { club: club.name })}</h2>
          <p>{t("You can join again any time from the club's link.")}</p>
          <p className="msg err" aria-live="polite">{error}</p>
          <div className="row">
            <button className="btn ghost" type="button" onClick={close}>{t("Cancel")}</button>
            <button className="btn" type="button" disabled={busy} onClick={() => run(() => leaveClub(club.id, me.id), () => router.push("/salon"))}>
              {busy ? t("One moment…") : t("Leave the club")}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/**
 * For hosts: who's in the club and what they can do. The owner makes co-hosts; any host can remove
 * someone, or ban them (they can't rejoin from the link, and their messages here go).
 */
function MembersSheet({ club, people, owner, onClose, onChanged }: {
  club: MyClub; people: RosterRow[]; owner: boolean; onClose: () => void; onChanged: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"remove" | "ban" | null>(null);
  const [banned, setBanned] = useState<Banned[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBanned = useCallback(async () => setBanned(await bannedFrom(club.id)), [club.id]);
  useEffect(() => { void loadBanned(); }, [loadBanned]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open

  const toggle = (id: string) => { setOpen((o) => (o === id ? null : id)); setConfirm(null); setError(null); };

  async function run(task: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    const err = await task();
    setBusy(false);
    if (err) return setError(t(err));
    setOpen(null);
    setConfirm(null);
    onChanged();
    void loadBanned();
  }

  const roleOf = (p: RosterRow) => (p.is_host ? "owner" : p.role ?? "member");
  const label = (p: RosterRow) => ({ owner: t("host"), cohost: t("co-host"), member: "" })[roleOf(p)];

  return (
    <Sheet onClose={onClose} label={t("Manage members")}>
      <h2>{t("Manage members")}</h2>
      <p className="muted">
        {owner
          ? t("Co-hosts can add to the shelf, start votes, remove people and delete messages. Only you can hand the club over or delete it.")
          : t("As a co-host you can remove people and delete messages in the chat.")}
      </p>
      {people.length === 0 ? <p className="muted">{t("Nobody else has joined yet.")}</p> : (
        <ul className="manage-list">
          {people.map((p) => {
            const role = roleOf(p);
            const canRemove = role !== "owner" && (role !== "cohost" || owner);
            const canPromote = owner && role !== "owner";
            const expanded = open === p.user_id;
            return (
              <li key={p.user_id}>
                <button type="button" className="manage-row" aria-expanded={expanded} onClick={() => toggle(p.user_id)}
                  disabled={!canRemove && !canPromote}>
                  <b>@{p.username}</b>
                  {label(p) && <span className="mono muted">{label(p)}</span>}
                  {(canRemove || canPromote) && <span className="muted" aria-hidden="true">{expanded ? "\u2212" : "\u2026"}</span>}
                </button>
                {expanded && (
                  confirm ? (
                    <div className="manage-actions">
                      <p>{confirm === "ban"
                        ? t("Ban @{name}? They're removed, can't join again from the link, and their messages here are deleted.", { name: p.username })
                        : t("Remove @{name}? They can join again from the club's link.", { name: p.username })}</p>
                      <div className="row">
                        <button className="btn ghost small" type="button" onClick={() => setConfirm(null)}>{t("Cancel")}</button>
                        <button className="btn danger-solid small" type="button" disabled={busy}
                          onClick={() => run(() => removeMember(club.id, p.user_id, confirm === "ban"))}>
                          {confirm === "ban" ? t("Ban") : t("Remove")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="manage-actions row">
                      {canPromote && (
                        <button className="btn ghost small" type="button" disabled={busy}
                          onClick={() => run(() => setCohost(club.id, p.user_id, role !== "cohost"))}>
                          {role === "cohost" ? t("No longer co-host") : t("Make co-host")}
                        </button>
                      )}
                      {canRemove && <button className="btn ghost small" type="button" onClick={() => setConfirm("remove")}>{t("Remove")}</button>}
                      {canRemove && <button className="btn ghost small danger-text" type="button" onClick={() => setConfirm("ban")}>{t("Ban")}</button>}
                    </div>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="msg err" aria-live="polite">{error}</p>

      {banned.length > 0 && (
        <>
          <h3 className="smallcaps muted">{t("Banned")}</h3>
          <ul className="manage-list">
            {banned.map((b) => (
              <li key={b.user_id}>
                <div className="manage-row">
                  <b>@{b.username}</b>
                  <button className="btn ghost small" type="button" disabled={busy} onClick={() => run(() => unban(club.id, b.user_id))}>{t("Unban")}</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="row"><button className="btn" type="button" onClick={onClose}>{t("Done")}</button></div>
    </Sheet>
  );
}

/** Each member can mute a busy club. They still see everything when they open it. */
function MuteSwitch({ clubId }: { clubId: string }) {
  const t = useT();
  const [muted, setMuted] = useState<boolean | null>(null);
  useEffect(() => { clubMuted(clubId).then(setMuted).catch(() => setMuted(null)); }, [clubId]);
  if (muted === null) return null;
  return (
    <label className="settings-row club-mute">
      <span>{t("Notifications from this club")}<small className="muted">{t("Messages, votes, new books and meeting reminders")}</small></span>
      <input className="switch" type="checkbox" role="switch" checked={!muted}
        onChange={(e) => { const on = e.target.checked; setMuted(!on); void setClubMuted(clubId, !on); }} />
    </label>
  );
}
