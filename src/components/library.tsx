"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { isNativeApp } from "@/lib/native";
import { useAuth } from "./auth";
import { DeleteAccount } from "./delete-account";
import { accept, befriend, unfriend } from "@/lib/friends";
import { shareLink, tap } from "@/lib/native";
import { joinDid, lastSeen, NOW_SLOTS, NOW_WORDS, nowAt, nowId, type NowPiece } from "@/lib/now";
import { friendlyError, supabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import { updateWidget } from "@/lib/widget";
import { dismissPushAsk, enablePush, pushAskDismissed, pushPermission } from "@/lib/push";
import { useRouter } from "next/navigation";
import { pathFromUrl } from "./push-setup";
import { THEMES, USERNAME } from "@/lib/themes";
import type { Friendship, Profile, RoomWithOwner } from "@/lib/types";
import { Gate } from "./gate";

export function LibraryScreen() {
  return <Gate>{(me) => <Library me={me} />}</Gate>;
}

/** One line per friend: what they put out recently, newest first. */
type Update = {
  ownerId: string; username: string; line: string; at: string; isNew: boolean;
  /** The most recent thing they put out, for the home-screen widget. */
  title: string; kind: "song" | "film" | "book"; cover: string | null;
};

const RECENT_DAYS = 7;

/** For you: notes on your wall and things friends left at your door. */
type InboxItem = { key: string; username: string; line: string; at: string; href: string; isNew: boolean };

type Shelf = {
  rooms: RoomWithOwner[];
  updates: Update[];
  inbox: InboxItem[];
  incoming: Profile[];
  outgoing: Profile[];
};

function Library({ me }: { me: Profile }) {
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    const sb = supabase();
    const { data: rows } = await sb.from("friendships").select("*");
    const friendships = (rows as Friendship[]) ?? [];
    const other = (f: Friendship) => (f.requester === me.id ? f.addressee : f.requester);
    const friendIds = friendships.filter((f) => f.status === "accepted").map(other);
    const incomingIds = friendships.filter((f) => f.status === "pending" && f.addressee === me.id).map(other);
    const outgoingIds = friendships.filter((f) => f.status === "pending" && f.requester === me.id).map(other);

    const [{ data: rooms }, { data: people }] = await Promise.all([
      sb.from("rooms")
        // All columns, so the shelf keeps working before and after the "now playing" columns exist.
        .select("*, profile:profiles(username)")
        .in("owner_id", [me.id, ...friendIds]),
      incomingIds.length + outgoingIds.length
        ? sb.from("profiles").select("id, username").in("id", [...incomingIds, ...outgoingIds])
        : Promise.resolve({ data: [] as Profile[] }),
    ]);
    const list = ((rooms as unknown as RoomWithOwner[]) ?? []).sort((a, b) =>
      a.owner_id === me.id ? -1 : b.owner_id === me.id ? 1 : (a.profile?.username ?? "").localeCompare(b.profile?.username ?? ""),
    );
    const byId = new Map(((people as Profile[]) ?? []).map((p) => [p.id, p]));

    // What friends left out this week.
    const cutoff = Date.now() - RECENT_DAYS * 864e5;
    const friends = list.filter((r) => r.owner_id !== me.id);
    const ids = friends.flatMap((r) => NOW_SLOTS.map((slot) => {
      const at = nowAt(r, slot);
      return at && new Date(at).getTime() > cutoff ? nowId(r, slot) : null;
    })).filter((id): id is string => Boolean(id));
    const { data: nowRows } = ids.length
      ? await sb.from("pieces").select("id, type, title, subtitle, cover_url").in("id", ids)
      : { data: [] as NowPiece[] };
    const nowById = new Map(((nowRows as NowPiece[]) ?? []).map((p) => [p.id, p]));
    const updates: Update[] = friends.flatMap((r) => {
      const recent = NOW_SLOTS.map((slot) => ({ slot, at: nowAt(r, slot), piece: nowById.get(nowId(r, slot) ?? "") }))
        .filter((x): x is { slot: typeof x.slot; at: string; piece: NowPiece } => Boolean(x.at && x.piece && new Date(x.at).getTime() > cutoff))
        .sort((a, b) => b.at.localeCompare(a.at));
      if (!recent.length) return [];
      const at = recent[0].at;
      const seen = lastSeen(r.owner_id);
      return [{
        ownerId: r.owner_id,
        username: r.profile?.username ?? "",
        line: joinDid(recent.map((x) => NOW_WORDS[x.slot].did(x.piece.title))),
        at,
        isNew: !seen || seen < at,
        title: recent[0].piece.title,
        kind: recent[0].slot,
        cover: recent[0].piece.cover_url,
      }];
    }).sort((a, b) => b.at.localeCompare(a.at));

    // Notes on your wall (last week) and recommendations waiting at your door.
    const weekAgo = new Date(cutoff).toISOString();
    const [{ data: notes }, { data: recs }] = await Promise.all([
      sb.from("notes").select("id, author, created_at").eq("room_owner", me.id).neq("author", me.id).gte("created_at", weekAgo).order("created_at", { ascending: false }).limit(10),
      sb.from("recommendations").select("id, from_user, title, type, created_at").eq("to_user", me.id).eq("status", "new").order("created_at", { ascending: false }).limit(10),
    ]);
    const senderIds = [...new Set([...(notes ?? []).map((n) => n.author as string), ...(recs ?? []).map((r) => r.from_user as string)])];
    const { data: senders } = senderIds.length ? await sb.from("profiles").select("id, username").in("id", senderIds) : { data: [] };
    const nameOf = new Map((senders ?? []).map((p) => [p.id as string, p.username as string]));
    const seenMine = lastSeen(me.id);
    const kindWord: Record<string, string> = { song: "a song", poster: "a film", scene: "a scene", book: "a book" };
    const inbox: InboxItem[] = [
      ...(notes ?? []).map((n) => ({ key: `n-${n.id}`, username: nameOf.get(n.author as string) ?? "someone", line: "left a note on your wall",
        at: n.created_at as string, href: `/r/${me.username}#guestbook`, isNew: !seenMine || seenMine < (n.created_at as string) })),
      ...(recs ?? []).map((r) => ({ key: `r-${r.id}`, username: nameOf.get(r.from_user as string) ?? "someone", line: `left you ${kindWord[r.type as string] ?? "something"}: ${r.title}`,
        at: r.created_at as string, href: `/r/${me.username}`, isNew: true })),
    ].sort((a, b) => b.at.localeCompare(a.at));

    updateWidget(updates.map(({ username, line, title, kind, at, isNew, cover }) => ({ username, line, title, kind, at, isNew, cover })));
    setShelf({
      rooms: list,
      updates,
      inbox,
      incoming: incomingIds.map((id) => byId.get(id)).filter((p): p is Profile => Boolean(p)),
      outgoing: outgoingIds.map((id) => byId.get(id)).filter((p): p is Profile => Boolean(p)),
    });
  }, [me.id, me.username]);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on mount
    const sb = supabase();
    const channel = sb
      .channel("my-friendships")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => load())
      // A friend putting on a record shows up while you're looking.
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notes", filter: `room_owner=eq.${me.id}` }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "recommendations", filter: `to_user=eq.${me.id}` }, () => load())
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [load, me.id]);

  async function addFriend() {
    const username = draft.trim().replace(/^@/, "").toLowerCase();
    if (!USERNAME.test(username)) return setMsg({ kind: "err", text: "Usernames are 3–20 letters, numbers or underscores." });
    if (username === me.username) return setMsg({ kind: "err", text: "That's your own room." });
    setBusy(true);
    try {
      const { data: person } = await supabase().from("profiles").select("id, username").eq("username", username).maybeSingle();
      if (!person) {
        setMsg({ kind: "err", text: `No one is called @${username} yet. Double-check the spelling with your friend.` });
      } else {
        const rel = await befriend(me.id, person.id);
        setMsg({
          kind: "ok",
          text: rel === "friends"
            ? `You and @${username} are friends. Their room is on your shelf.`
            : `Request sent. @${username}'s room joins your shelf when they accept.`,
        });
        setDraft("");
        await load();
      }
    } catch (error) {
      setMsg({ kind: "err", text: friendlyError(error, "Couldn't add them right now. Try again.") });
    }
    setBusy(false);
  }

  // Early on, most friends won't have Bottega yet, so a link works better than a username search.
  async function sendLink() {
    const url = `${window.location.origin}/r/${me.username}`;
    const result = await shareLink(`My room on Bottega`, url);
    if (result === "shared" || result === "copied") track("share_link", { room: me.id, detail: "library" });
    if (result === "copied") setMsg({ kind: "ok", text: "Link copied. Send it to a friend." });
    else if (result === "failed") setMsg({ kind: "err", text: `Couldn't share. Your link is ${url}` });
  }

  async function respond(person: Profile, yes: boolean) {
    try {
      if (yes) await accept(person.id, me.id);
      else await unfriend(me.id, person.id);
      await load();
    } catch (error) {
      setMsg({ kind: "err", text: friendlyError(error) });
    }
  }

  // The door swings open before you step through (skipped with Reduce Motion).
  function openDoor(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    tap();
    e.currentTarget.classList.add("opening");
    setTimeout(() => router.push(href), 420);
  }

  if (!shelf) return <p className="loading">Lighting the hallway…</p>;
  const friendCount = shelf.rooms.length - 1;
  const newIds = new Set(shelf.updates.filter((u) => u.isNew).map((u) => u.ownerId));
  if (shelf.inbox.some((i) => i.isNew)) newIds.add(me.id);

  return (
    <div>
      <section className="lib-head">
        <div>
          <h1>Your library</h1>
          <p>Every door is someone&rsquo;s room. Step inside.</p>
        </div>
        <div className="addfriend">
          <form onSubmit={(e) => { e.preventDefault(); addFriend(); }}>
            <div className="at">
              <input ref={inputRef} id="friend-input" type="text" enterKeyHint="send" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} maxLength={21}
                placeholder="friend's username" aria-label="Friend's username" value={draft}
                onChange={(e) => setDraft(e.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={busy}>Add</button>
          </form>
          <p className={`msg ${msg?.kind ?? ""}`} aria-live="polite">{msg?.text}</p>
        </div>
      </section>

      {(shelf.incoming.length > 0 || shelf.outgoing.length > 0) && (
        <section className="requests" aria-label="Friend requests">
          {shelf.incoming.map((p) => (
            <div className="request" key={p.id}>
              <span><b>@{p.username}</b> wants to swap keys with you.</span>
              <span className="row">
                <button className="btn small" type="button" onClick={() => respond(p, true)}>Accept</button>
                <button className="btn ghost small" type="button" onClick={() => respond(p, false)}>Decline</button>
              </span>
            </div>
          ))}
          {shelf.outgoing.map((p) => (
            <div className="request" key={p.id}>
              <span className="muted">Waiting for <b>@{p.username}</b> to accept.</span>
              <button className="btn ghost small" type="button" onClick={() => respond(p, false)}>Cancel</button>
            </div>
          ))}
        </section>
      )}

      {shelf.inbox.length > 0 && (
        <section className="updates inbox" aria-label="For you">
          {shelf.inbox.map((u) => (
            <Link key={u.key} href={u.href} className={`update${u.isNew ? " new" : ""}`}>
              {u.isNew && <span className="dot" aria-label="New" />}
              <span><b>@{u.username}</b> {u.line}</span>
              <span className="when">{ago(u.at)}</span>
            </Link>
          ))}
        </section>
      )}

      {shelf.updates.length > 0 && (
        <section className="updates" aria-label="What friends put on">
          {shelf.updates.map((u) => (
            <Link key={u.ownerId} href={`/r/${u.username}`} className={`update${u.isNew ? " new" : ""}`}>
              {u.isNew && <span className="dot" aria-label="New" />}
              <span><b>@{u.username}</b> {u.line}</span>
              <span className="when">{ago(u.at)}</span>
            </Link>
          ))}
        </section>
      )}

      <div className="hall" role="list" aria-label="Rooms">
        {shelf.rooms.map((room) => {
          const t = THEMES[room.theme] ?? THEMES.oak;
          const username = room.profile?.username ?? "";
          const mine = room.owner_id === me.id;
          const update = shelf.updates.find((u) => u.ownerId === room.owner_id);
          const fresh = newIds.has(room.owner_id);
          return (
            <div role="listitem" key={room.owner_id} className={`hall-door${mine ? " mine" : ""}${fresh ? " new" : ""}`}>
              <Link
                href={`/r/${username}`}
                className="door-link"
                aria-label={`${mine ? "Your room" : `@${username}'s room`}: ${room.name}${fresh ? ", something new" : ""}`}
                onClick={(e) => openDoor(e, `/r/${username}`)}
                style={{ "--dr-paint": t.wall, "--dr-ink": t.ink, "--dr-accent": t.accent, "--dr-floor": t.floor } as CSSProperties}
              >
                <span className="lamp" aria-hidden="true" />
                <span className="doorway" aria-hidden="true">
                  <span className="inside" />
                  <span className="leaf">
                    <span className="dpanel top" />
                    <span className="dpanel bottom" />
                    <span className="plate">@{username}</span>
                    <span className="knob" />
                  </span>
                </span>
                <span className="step" aria-hidden="true" />
              </Link>
              <p className="door-name">{mine ? "Your room" : room.name}</p>
              {update ? (
                <p className="door-now">{update.kind === "song" ? "♪" : update.kind === "film" ? "▶︎" : "❦"} {update.title}</p>
              ) : mine ? <p className="door-now">{room.name}</p> : null}
            </div>
          );
        })}
        <div role="listitem" className="hall-door add">
          <button type="button" className="door-link" onClick={() => inputRef.current?.focus()} aria-label="Add a friend by username">
            <span className="doorway" aria-hidden="true"><span className="leaf"><span className="plus">+</span></span></span>
            <span className="step" aria-hidden="true" />
          </button>
          <p className="door-name">Add a friend</p>
        </div>
      </div>
      {friendCount > 0 && <PushAsk userId={me.id} />}
      <EmailSwitch userId={me.id} />
      <AppSignOut />
      <footer className="lib-foot">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/support">Help</a>
        <DeleteAccount username={me.username} />
      </footer>

      {friendCount < 3 ? (
        <div className="invite">
          <p>
            {friendCount === 0 ? "Your shelf is just you for now." : "A shelf feels like a library at three friends."}{" "}
            Send your room link. When a friend makes their own room from it, you&rsquo;ll get their friend request.
          </p>
          <button className="btn" type="button" onClick={sendLink}>Send my room link</button>
        </div>
      ) : (
        <p className="lib-note">Friends can see your room and you can see theirs. Change who can come in from your room&rsquo;s Customize menu.</p>
      )}
    </div>
  );
}


/** "just now", "3h", "yesterday", "Tue". */
function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 6e4);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  if (hours < 48) return "yesterday";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short" });
}

/** One daily email, only on days a friend put something on. On unless turned off. */
function EmailSwitch({ userId }: { userId: string }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    supabase().from("email_prefs").select("digest").eq("user_id", userId).maybeSingle()
      .then(({ data, error }) => {
        if (error) return setFailed(true); // The database update isn't in yet: hide the switch.
        setOn(data ? Boolean(data.digest) : true);
      });
  }, [userId]);

  async function change(next: boolean) {
    setOn(next);
    const { error } = await supabase().from("email_prefs").upsert({ user_id: userId, digest: next }, { onConflict: "user_id" });
    if (error) setOn(!next);
  }

  if (failed || on === null) return null;
  return (
    <label className="check email-switch">
      <input type="checkbox" checked={on} onChange={(e) => change(e.target.checked)} />
      <span>Email me when friends put something on <span className="muted">(at most once a day)</span></span>
    </label>
  );
}

/** iPhone app only: once you have a friend, offer a nudge when they put something on. Asked once. */
function PushAsk({ userId }: { userId: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (pushAskDismissed()) return;
    pushPermission().then((p) => setShow(p === "prompt"));
  }, []);
  if (!show) return null;
  return (
    <div className="invite push-ask">
      <p>Get a nudge when a friend puts something on. <span className="muted">At most one per friend every few hours.</span></p>
      <div className="row">
        <button className="btn" type="button" onClick={async () => {
          await enablePush(userId, (url) => router.push(pathFromUrl(url)));
          dismissPushAsk();
          setShow(false);
        }}>Turn on</button>
        <button className="btn ghost" type="button" onClick={() => { dismissPushAsk(); setShow(false); }}>Not now</button>
      </div>
    </div>
  );
}

/** In the app the top links are replaced by the tab bar, so signing out lives here. */
function AppSignOut() {
  const auth = useAuth();
  const native = useSyncExternalStore(() => () => {}, isNativeApp, () => false);
  if (!native) return null;
  return <p className="lib-note"><button className="linkish" type="button" onClick={() => auth.signOut()}>Sign out</button></p>;
}
