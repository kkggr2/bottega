"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ago, chatMembers, chatMessages, myChatRooms, myThreads, reportMessage, sendChat, SLOT_PLACE,
  type ChatMember, type ChatMessage, type ChatRoom,
} from "@/lib/chat";
import { befriend } from "@/lib/friends";
import { blockPerson } from "@/lib/safety";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import type { Profile } from "@/lib/types";
import { Gate } from "./gate";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- covers from Apple Music, TMDB and Open Library */

/*
 * Tonight's rooms: one chat per artist, director or author you have on right now.
 * Messages last a day. From a message you can swap keys or write to that person privately.
 */

const roomHref = (key: string) => `/chat?room=${encodeURIComponent(key)}`;

/** For the library: the rooms you can walk into right now, and a way to your messages. */
export function TonightRooms() {
  const [rooms, setRooms] = useState<ChatRoom[] | null>(null);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    myChatRooms().then(setRooms).catch(() => setRooms([]));
    myThreads().then((t) => setUnread(t.reduce((n, x) => n + x.unread, 0))).catch(() => {});
  }, []);
  if (!rooms) return null;
  return (
    <section className="tonight" aria-label="Tonight's rooms">
      <div className="tonight-head">
        <h2>Tonight&rsquo;s rooms</h2>
        <Link href="/messages" className="btn ghost small">Messages{unread ? <span className="badge">{unread}</span> : null}</Link>
      </div>
      {rooms.length === 0 ? (
        <p className="muted">Put a record on your turntable, a film in your TV or a book on your armchair, and you can talk with everyone who has the same artist, director or author on tonight.</p>
      ) : (
        <div className="tonight-list">
          {rooms.map((r) => (
            <Link key={r.room_key} href={roomHref(r.room_key)} className="tonight-room">
              <span className="mono">{r.slot === "song" ? "On the turntable" : r.slot === "film" ? "In the TV" : "On the armchair"}</span>
              <b>{r.creator} tonight</b>
              <span className="muted">
                {r.people > 1 ? `${r.people} people` : "Just you so far"}
                {r.messages ? ` · ${r.messages} message${r.messages === 1 ? "" : "s"}` : ""}
                {r.last_at ? ` · ${ago(r.last_at)}` : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function ChatScreen() {
  return <Gate>{(me) => <ChatView me={me} />}</Gate>;
}

export function ChatView({ me }: { me: Profile }) {
  const params = useSearchParams();
  const key = params.get("room") ?? "";
  const [room, setRoom] = useState<ChatRoom | null | undefined>(undefined);
  const [members, setMembers] = useState<ChatMember[]>([]);

  useEffect(() => {
    Promise.all([myChatRooms(), chatMembers(key)]).then(([rooms, mem]) => {
      setRoom(rooms.find((r) => r.room_key === key) ?? null);
      setMembers(mem);
    }).catch(() => setRoom(null));
    track("chat_open", { detail: key });
  }, [key]);

  if (room === undefined) return <p className="loading">Opening the door…</p>;
  if (room === null) {
    return (
      <section className="chat">
        <Link href="/" className="mono muted back">&larr; Library</Link>
        <h1>This room is closed to you tonight.</h1>
        <p className="muted">You can be in a room while something by that artist, director or author is on in your own room.</p>
      </section>
    );
  }

  return (
    <section className="chat">
      <Link href="/" className="mono muted back">&larr; Library</Link>
      <h1>{room.creator} tonight</h1>
      <p className="muted">Everyone here has {room.creator} {SLOT_PLACE[room.slot]}. Messages last a day.</p>
      <div className="chat-members" aria-label="Who's here">
        {members.map((m) => (
          <Link key={m.user_id} href={`/r/${m.username}`} className="chat-member" title={m.title}>
            {m.cover_url ? <img src={m.cover_url} alt="" /> : <span className="noart" />}
            <span>@{m.username}</span>
          </Link>
        ))}
      </div>
      <ChatLog me={me} roomKey={key} people={members} placeholder={`Say something about ${room.creator}…`}
        empty="Nobody has said anything yet tonight. Start with what you have on, and why." />
    </section>
  );
}

/** A live chat: the messages, a box to write in, and the tap-a-message menu. Used by tonight's rooms and clubs. */
export function ChatLog({ me, roomKey, people, placeholder, empty }: {
  me: Profile;
  roomKey: string;
  people: { user_id: string; username: string; title?: string | null }[];
  placeholder: string;
  empty: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<ChatMessage | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => setMessages(await chatMessages(roomKey)), [roomKey]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open
    // New messages arrive live. The database only sends rooms you can read; this keeps to this one.
    const sb = supabase();
    const channel = sb.channel(`chat-${roomKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, (p) => {
        const row = (p.new ?? p.old) as ChatMessage;
        if (row?.room_key !== roomKey) return;
        if (p.eventType === "INSERT") setMessages((m) => (m.some((x) => x.id === row.id) ? m : [...m, row]));
        if (p.eventType === "DELETE") setMessages((m) => m.filter((x) => x.id !== row.id));
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [roomKey, load]);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  async function send() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    const err = await sendChat(roomKey, me.id, draft);
    setBusy(false);
    if (err) return setError(err);
    track("chat_send", { detail: roomKey.slice(0, 40) });
    setDraft("");
    setError(null);
    void load();
  }

  const nameOf = (id: string) => people.find((m) => m.user_id === id)?.username ?? "someone";
  const titleOf = (id: string) => people.find((m) => m.user_id === id)?.title;

  return (
    <>
      <div className="chat-log" aria-live="polite">
        {messages.length === 0 && <p className="muted chat-empty">{empty}</p>}
        {messages.map((m) => {
          const mine = m.author === me.id;
          return (
            <button key={m.id} type="button" className={`chat-msg${mine ? " mine" : ""}`} onClick={() => setPicked(m)}>
              <span className="who">{mine ? "You" : `@${nameOf(m.author)}`}{titleOf(m.author) ? <span className="muted"> · {titleOf(m.author)}</span> : null}</span>
              <span className="body">{m.body}</span>
              <span className="when muted">{ago(m.created_at)}</span>
            </button>
          );
        })}
        <div ref={end} />
      </div>

      <form className="chat-send" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <input type="text" value={draft} maxLength={500} placeholder={placeholder} enterKeyHint="send"
          onChange={(e) => setDraft(e.target.value)} aria-label="Message" />
        <button className="btn" type="submit" disabled={busy || !draft.trim()}>Send</button>
      </form>
      <p className="msg err" aria-live="polite">{error}</p>

      {picked && (
        <MessageSheet me={me} message={picked} username={nameOf(picked.author)} kind="chat"
          onClose={() => setPicked(null)} onChanged={() => { setPicked(null); void load(); }} />
      )}
    </>
  );
}

/** Tap a message: write privately, swap keys, report it, or block the person. Your own: delete it. */
export function MessageSheet({ me, message, username, kind, onClose, onChanged }: {
  me: Profile;
  message: { id: string; body: string; author?: string; sender?: string };
  username: string;
  kind: "chat" | "dm";
  onClose: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const author = message.author ?? message.sender ?? "";
  const mine = author === me.id;
  const [mode, setMode] = useState<"menu" | "report" | "block">("menu");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function swapKeys() {
    setBusy(true);
    try {
      const rel = await befriend(me.id, author);
      setNote(rel === "friends" ? `You and @${username} have swapped keys.` : `Asked @${username} to swap keys. Their room opens to you when they say yes.`);
    } catch {
      setNote("Couldn't ask right now. Try again.");
    }
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    await supabase().from(kind === "chat" ? "chat_messages" : "direct_messages").delete().eq("id", message.id);
    setBusy(false);
    onChanged();
  }

  async function report() {
    if (!reason.trim()) return setNote("Say what's wrong in a few words.");
    setBusy(true);
    const err = await reportMessage(kind, message.id, reason);
    setBusy(false);
    setNote(err ?? "Thanks for telling us. We look at every report within a day.");
    if (!err) setMode("menu");
  }

  async function block() {
    setBusy(true);
    const err = await blockPerson(me.id, author);
    setBusy(false);
    if (err) return setNote(err);
    onChanged();
    if (kind === "dm") router.push("/messages");
  }

  return (
    <Sheet onClose={onClose} label="Message">
      <blockquote className="sheet-quote">&ldquo;{message.body}&rdquo;</blockquote>
      {mode === "menu" && (
        <div className="stack">
          {mine ? (
            <button className="btn ghost danger-text" type="button" disabled={busy} onClick={remove}>Delete my message</button>
          ) : (
            <>
              {kind === "chat" && <Link className="btn" href={`/messages?with=${encodeURIComponent(username)}`}>Write to @{username} privately</Link>}
              <button className="btn ghost" type="button" disabled={busy} onClick={swapKeys}>Swap keys with @{username}</button>
              <Link className="btn ghost" href={`/r/${username}`}>See @{username}&rsquo;s room</Link>
              <button className="btn ghost" type="button" onClick={() => setMode("report")}>Report this message</button>
              <button className="btn ghost danger-text" type="button" onClick={() => setMode("block")}>Block @{username}</button>
            </>
          )}
          <p className="msg ok" aria-live="polite">{note}</p>
        </div>
      )}
      {mode === "report" && (
        <div className="stack">
          <div className="field">
            <label htmlFor="report-msg">What&rsquo;s wrong?</label>
            <textarea id="report-msg" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Something offensive, harassment, spam…" />
            <span className="hint">We look at every report within a day. @{username} won&rsquo;t see who reported.</span>
          </div>
          <p className="msg err">{note}</p>
          <div className="row">
            <button className="btn ghost" type="button" onClick={() => setMode("menu")}>Back</button>
            <button className="btn" type="button" disabled={busy} onClick={report}>{busy ? "Sending…" : "Send report"}</button>
          </div>
        </div>
      )}
      {mode === "block" && (
        <div className="stack">
          <p>You won&rsquo;t see each other&rsquo;s messages or rooms anymore, and they can&rsquo;t write to you. They aren&rsquo;t told.</p>
          <p className="msg err">{note}</p>
          <div className="row">
            <button className="btn ghost" type="button" onClick={() => setMode("menu")}>Back</button>
            <button className="btn danger-solid" type="button" disabled={busy} onClick={block}>{busy ? "Blocking…" : `Block @${username}`}</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
