"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { accept, befriend, unfriend } from "@/lib/friends";
import { friendlyError, supabase } from "@/lib/supabase";
import { THEMES, USERNAME } from "@/lib/themes";
import type { Friendship, Profile, RoomWithOwner } from "@/lib/types";
import { Gate } from "./gate";

export function LibraryScreen() {
  return <Gate>{(me) => <Library me={me} />}</Gate>;
}

type Shelf = {
  rooms: RoomWithOwner[];
  incoming: Profile[];
  outgoing: Profile[];
};

function Library({ me }: { me: Profile }) {
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        .select("owner_id, name, tagline, theme, wallpaper, visibility, profile:profiles(username)")
        .in("owner_id", [me.id, ...friendIds]),
      incomingIds.length + outgoingIds.length
        ? sb.from("profiles").select("id, username").in("id", [...incomingIds, ...outgoingIds])
        : Promise.resolve({ data: [] as Profile[] }),
    ]);
    const list = ((rooms as unknown as RoomWithOwner[]) ?? []).sort((a, b) =>
      a.owner_id === me.id ? -1 : b.owner_id === me.id ? 1 : (a.profile?.username ?? "").localeCompare(b.profile?.username ?? ""),
    );
    const byId = new Map(((people as Profile[]) ?? []).map((p) => [p.id, p]));
    setShelf({
      rooms: list,
      incoming: incomingIds.map((id) => byId.get(id)).filter((p): p is Profile => Boolean(p)),
      outgoing: outgoingIds.map((id) => byId.get(id)).filter((p): p is Profile => Boolean(p)),
    });
  }, [me.id]);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on mount
    const sb = supabase();
    const channel = sb
      .channel("my-friendships")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => load())
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [load]);

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

  async function respond(person: Profile, yes: boolean) {
    try {
      if (yes) await accept(person.id, me.id);
      else await unfriend(me.id, person.id);
      await load();
    } catch (error) {
      setMsg({ kind: "err", text: friendlyError(error) });
    }
  }

  if (!shelf) return <p className="loading">Dusting the shelves…</p>;
  const friendCount = shelf.rooms.length - 1;

  return (
    <div>
      <section className="lib-head">
        <div>
          <p className="mono muted">
            {shelf.rooms.length} {shelf.rooms.length === 1 ? "room" : "rooms"} on your shelf
          </p>
          <h1>Your library</h1>
          <p>Every spine is someone&rsquo;s room. Pull one out to step inside.</p>
        </div>
        <div className="addfriend">
          <form onSubmit={(e) => { e.preventDefault(); addFriend(); }}>
            <div className="at">
              <input ref={inputRef} id="friend-input" type="text" autoComplete="off" spellCheck={false} maxLength={21}
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

      <div className="shelf">
        {shelf.rooms.map((room) => {
          const t = THEMES[room.theme] ?? THEMES.oak;
          const username = room.profile?.username ?? "";
          return (
            <Link
              key={room.owner_id}
              href={`/r/${username}`}
              className={`spine${room.owner_id === me.id ? " me" : ""}`}
              title={`${room.name} · @${username}`}
              style={{
                height: 176 + (hash(room.owner_id) % 50),
                "--sp-wall": t.wall, "--sp-ink": t.ink, "--sp-accent": t.accent,
              } as CSSProperties}
            >
              <span className="t">{room.name}</span>
              <span className="h">@{username}</span>
            </Link>
          );
        })}
        <button className="spine add" type="button" style={{ height: 200 }} onClick={() => inputRef.current?.focus()}>
          <span className="t">+ a friend</span>
        </button>
      </div>
      <p className="lib-note">
        {friendCount === 0
          ? "Your shelf is just you for now. Ask a friend for their Bottega username and add it above."
          : "Friends can see your room and you can see theirs. Change who can come in from your room's Customize menu."}
      </p>
    </div>
  );
}

function hash(s: string): number {
  let n = 0;
  for (const c of s) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return n;
}
