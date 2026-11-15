"use client";

import qrcode from "qrcode-generator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  APP_STORE, clubPublic, clubStats, createClub, joinClub, joinUrl, myClubs, rememberClub, rememberInvite, roster, slugify,
  type ClubPublic, type ClubStats, type MyClub, type RosterRow,
} from "@/lib/clubs";
import { befriend } from "@/lib/friends";
import { isNativeApp, shareLink } from "@/lib/native";
import type { ClubQuizCard } from "@/lib/quiz/types";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import type { Profile } from "@/lib/types";
import { useAuth } from "./auth";
import { ChatLog } from "./chat";
import { SALON, usePalette } from "@/lib/room-colors";
import { Gate } from "./gate";
import { Sheet } from "./sheet";

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
  const [club, setClub] = useState<ClubPublic | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signedIn = auth.status === "ready";

  useEffect(() => {
    clubPublic(slug).then((c) => {
      setClub(c);
      if (c) track("club_view", { detail: c.slug });
    }).catch(() => setClub(null));
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

  if (club === undefined) return <p className="loading">Finding the club…</p>;
  if (club === null) {
    return (
      <section className="join">
        <h1>There&rsquo;s no club at this link.</h1>
        <p className="muted">Check the link with whoever sent it, or <Link href="/">make your own room</Link>.</p>
      </section>
    );
  }

  const iphoneBrowser = typeof navigator !== "undefined" && /iPhone|iPad/.test(navigator.userAgent) && !isNativeApp();

  return (
    <section className="join">
      <p className="join-emoji" aria-hidden="true">{club.emoji}</p>
      <p className="mono muted">You&rsquo;re invited</p>
      <h1>{club.name}</h1>
      <p className="lede">
        @{club.host_username} started this club on Bottega. Everyone gets one room for the films, books and records they love.
        Join to see the others&rsquo; rooms, swap keys, and talk in the club&rsquo;s own chat.
      </p>
      <p className="muted">{club.members === 1 ? "1 person is in" : `${club.members} people are in`} so far.</p>
      {signedIn ? (
        <button className="btn big" type="button" disabled={busy} onClick={join}>{busy ? "Joining…" : `Join ${club.name}`}</button>
      ) : (
        <div className="join-actions">
          {iphoneBrowser && <a className="btn big" href={APP_STORE}>Get Bottega for iPhone</a>}
          <Link className={`btn big${iphoneBrowser ? " ghost" : ""}`} href="/">{iphoneBrowser ? "Or join on the web" : "Make your room and join"}</Link>
          <p className="hint">Takes a minute. You&rsquo;ll land in the club once your room is ready.</p>
        </div>
      )}
      <p className="msg err">{error}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The club page: for members.
// ---------------------------------------------------------------------------

export function ClubScreen({ slug }: { slug: string }) {
  return <Gate>{(me) => <ClubView me={me} slug={slug} />}</Gate>;
}

export function ClubView({ me, slug }: { me: Profile; slug: string }) {
  usePalette(SALON, "salon");
  const [club, setClub] = useState<MyClub | null | undefined>(undefined);
  const [people, setPeople] = useState<RosterRow[]>([]);
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

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
    setNote(others.length ? `Asked ${others.length} ${others.length === 1 ? "person" : "people"} to swap keys.` : "You've already swapped keys with everyone.");
    void load();
  }

  if (club === undefined) return <p className="loading">Opening the club…</p>;
  if (club === null) {
    return (
      <section className="chat">
        <Link href="/salon" className="mono muted back">&larr; Salon</Link>
        <h1>You&rsquo;re not in this club yet.</h1>
        <Link className="btn" href={`/join/${slug}`}>See the invitation</Link>
      </section>
    );
  }

  const label: Record<RosterRow["relation"], string> = { me: "You", friends: "Keys swapped", asked: "Asked", asking: "Accept", none: "Swap keys" };
  const canSwap = people.some((p) => p.relation === "none" || p.relation === "asking");

  return (
    <section className="chat club">
      <Link href="/salon" className="mono muted back">&larr; Salon</Link>
      <p className="join-emoji small" aria-hidden="true">{club.emoji}</p>
      <h1>{club.name}</h1>
      <div className="row club-actions">
        <button className="btn" type="button" onClick={() => setSharing(true)}>Invite people</button>
        {canSwap && <button className="btn ghost" type="button" disabled={busy} onClick={swapAll}>Swap keys with everyone</button>}
      </div>
      <p className="msg ok" aria-live="polite">{note}</p>

      {stats && (
        <div className="club-stats" aria-label="How the link is doing">
          <span><b>{stats.members}</b> joined</span>
          <span><b>{stats.joined_7d}</b> this week</span>
          <span><b>{stats.came_back}</b> came back</span>
          <span><b>{stats.active_7d}</b> active this week</span>
        </div>
      )}

      <ClubQuizzes slug={club.slug} />

      <h2 className="thread-h">Members</h2>
      <ul className="roster">
        {people.map((p) => (
          <li key={p.user_id}>
            <Link href={`/r/${p.username}`}>
              <b>@{p.username}</b>{p.is_host && <span className="mono muted"> host</span>}
              {p.now_title && <span className="muted"> · {p.now_title}</span>}
            </Link>
            {p.relation === "none" || p.relation === "asking"
              ? <button className="btn small" type="button" disabled={busy} onClick={() => swap(p)}>{label[p.relation]}</button>
              : <span className="mono muted">{label[p.relation]}</span>}
          </li>
        ))}
      </ul>

      <h2 className="thread-h">Club chat</h2>
      <p className="muted">Only members can read it. Messages last a week.</p>
      <ChatLog me={me} roomKey={`club:${club.slug}`} people={people.map((p) => ({ user_id: p.user_id, username: p.username, title: p.now_title }))}
        placeholder={`Write to ${club.name}…`} empty="Nobody has written yet. Say hello, or ask what everyone's into this week." />

      {sharing && <InviteSheet club={club} onClose={() => setSharing(false)} />}
    </section>
  );
}

/** The club's own quizzes: one try each, with a high score table only the club sees. */
function ClubQuizzes({ slug }: { slug: string }) {
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
      <h2 className="thread-h">Club quizzes</h2>
      <div className="club-quizzes">
        {quizzes.map((q) => (
          <Link key={q.id} href={`/club/${slug}/quiz/${q.id}`} className={`quiz-card${q.mine?.done ? " played" : ""}`}>
            <span className="mono">{q.mine?.done ? "Played" : q.mine ? "Started" : "New"}</span>
            <b>{q.title}</b>
            <span className="muted">
              {q.mine?.done
                ? `${q.mine.score} points · ${q.mine.correct} of ${q.count} right${q.played > 1 ? ` · ${q.played} played` : ""}`
                : `${q.blurb.replace(/[.!?]$/, "")} · ${q.count} questions${q.played ? ` · ${q.played} played` : ""}`}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}

/** The club's link and QR code, for messages, posters and the screen at a screening. */
function InviteSheet({ club, onClose }: { club: MyClub; onClose: () => void }) {
  const url = joinUrl(club.slug);
  const [msg, setMsg] = useState<string | null>(null);
  const svg = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }, [url]);

  async function share() {
    const result = await shareLink(`Join ${club.name} on Bottega`, url);
    if (result === "copied") setMsg("Link copied.");
    else if (result === "failed") setMsg(`Couldn't share. The link is ${url}`);
  }

  return (
    <Sheet onClose={onClose} label="Invite people">
      <h2>Invite people to {club.name}</h2>
      <div className="club-qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="club-link">{url.replace(/^https:\/\//, "")}</p>
      <p className="hint">Anyone who joins is connected with the host straight away. Show the code at a screening, or send the link.</p>
      <p className="msg ok">{msg}</p>
      <div className="row"><button className="btn" type="button" onClick={share}>Share link</button></div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// In the library: your clubs, and starting one.
// ---------------------------------------------------------------------------

export function ClubsSection() {
  const router = useRouter();
  const [clubs, setClubs] = useState<MyClub[] | null>(null);
  const [starting, setStarting] = useState(false);
  useEffect(() => { myClubs().then(setClubs).catch(() => setClubs([])); }, []);
  if (!clubs) return null;
  return (
    <section className="tonight" aria-label="Your clubs">
      <div className="tonight-head">
        <h2>Clubs</h2>
        <button className="btn ghost small" type="button" onClick={() => setStarting(true)}>Start a club</button>
      </div>
      {clubs.length === 0 ? (
        <p className="muted">Run a film club, a book club, or a group chat of friends? Start a club and share one link: everyone who joins lands in the same place.</p>
      ) : (
        <div className="tonight-list">
          {clubs.map((c) => (
            <Link key={c.id} href={`/club/${c.slug}`} className="tonight-room">
              <span className="mono">{c.is_host ? "Your club" : "Club"}</span>
              <b>{c.emoji} {c.name}</b>
              <span className="muted">{c.members} {c.members === 1 ? "member" : "members"}{c.messages ? ` · ${c.messages} new today` : ""}</span>
            </Link>
          ))}
        </div>
      )}
      {starting && <StartClubSheet onClose={() => setStarting(false)} onDone={(slug) => router.push(`/club/${slug}`)} />}
    </section>
  );
}

const EMOJI = ["🎬", "📚", "🎞️", "💿", "🎷", "🍿", "🌙", "☕"];

function StartClubSheet({ onClose, onDone }: { onClose: () => void; onDone: (slug: string) => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [emoji, setEmoji] = useState(EMOJI[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = slugTouched ? slug : slugify(name);

  async function start() {
    setBusy(true);
    const err = await createClub(link, name, emoji);
    setBusy(false);
    if (err) return setError(err);
    track("club_create", { detail: link });
    onDone(link);
  }

  return (
    <Sheet onClose={onClose} onSubmit={start} label="Start a club">
      <h2>Start a club</h2>
      <div className="field">
        <label htmlFor="club-name">Name</label>
        <input id="club-name" type="text" maxLength={60} placeholder="Gray Fox Book Club" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="club-slug">Link</label>
        <div className="link-field"><span>bottegarooms.com/join/</span>
          <input id="club-slug" type="text" maxLength={40} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={link}
            onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }} />
        </div>
      </div>
      <div className="field">
        <span className="label">Sign</span>
        <div className="chips">
          {EMOJI.map((e) => <button key={e} type="button" className="chip" aria-pressed={emoji === e} onClick={() => setEmoji(e)}>{e}</button>)}
        </div>
      </div>
      <p className="msg err">{error}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit" disabled={busy || name.trim().length < 2 || link.length < 3}>{busy ? "Starting…" : "Start the club"}</button>
      </div>
    </Sheet>
  );
}
