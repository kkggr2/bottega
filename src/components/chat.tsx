"use client";

import { useT } from "@/lib/i18n";
import { useRemembered } from "@/lib/remember";
import { useAuth } from "./auth";
import { GuestCantWrite } from "./guest";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ago, chatMembers, chatMessages, myChatRooms, reportMessage, sendChat, SLOT_PLACE,
  type ChatMember, type ChatMessage, type ChatRoom,
} from "@/lib/chat";
import { befriend } from "@/lib/friends";
import { blockPerson } from "@/lib/safety";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import type { Profile } from "@/lib/types";
import { SALON, usePalette } from "@/lib/room-colors";
import { Gate } from "./gate";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- covers from Apple Music, TMDB and Open Library */

/*
 * Tonight's rooms: one chat per artist, director or author you have on right now.
 * Messages last a day. From a message you can swap keys or write to that person privately.
 */

const roomHref = (key: string) => `/chat?room=${encodeURIComponent(key)}`;

/** For the Salon: the rooms you can walk into right now. */
export function TonightRooms() {
  const t = useT();
  const { userId } = useAuth();
  const [rooms, setRooms] = useRemembered<ChatRoom[] | null>(userId ? `tonight:${userId}` : null, null);
  useEffect(() => {
    myChatRooms().then(setRooms).catch(() => setRooms([]));
  }, [setRooms]);
  if (!rooms) return null;
  return (
    <section className="tonight" aria-label={t("Tonight's rooms")}>
      <div className="tonight-head">
        <h2>{t("Tonight's rooms")}</h2>
      </div>
      {rooms.length === 0 ? (
        <p className="muted">{t("Put a record on your turntable, a film in your TV or a book on your armchair, and you can talk with everyone who has the same artist, director or author on tonight.")}</p>
      ) : (
        <div className="tonight-list">
          {rooms.map((r) => (
            <Link key={r.room_key} href={roomHref(r.room_key)} className="tonight-room">
              <span className="mono">{r.slot === "song" ? t("On the turntable") : r.slot === "film" ? t("In the TV") : t("On the armchair")}</span>
              <b>{t("{name} tonight", { name: r.creator })}</b>
              <span className="muted">
                {r.people > 1 ? t("{n} people", { n: r.people }) : t("Just you so far")}
                {r.messages ? ` · ${r.messages === 1 ? t("1 message") : t("{n} messages", { n: r.messages })}` : ""}
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
  const t = useT();
  usePalette(SALON, "salon");
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

  if (room === undefined) return <p className="loading">{t("Opening the door…")}</p>;
  if (room === null) {
    return (
      <section className="chat">
        <Link href="/salon" className="mono muted back">&larr; {t("Salon")}</Link>
        <h1>{t("This room is closed to you tonight.")}</h1>
        <p className="muted">{t("You can be in a room while something by that artist, director or author is on in your own room.")}</p>
      </section>
    );
  }

  return (
    <section className="chat">
      <Link href="/salon" className="mono muted back">&larr; {t("Salon")}</Link>
      <h1>{t("{name} tonight", { name: room.creator })}</h1>
      <p className="muted">{t("Everyone here has {name} " + SLOT_PLACE[room.slot] + ". Messages last a day.", { name: room.creator })}</p>
      <div className="chat-members" aria-label={t("Who's here")}>
        {members.map((m) => (
          <Link key={m.user_id} href={`/r/${m.username}`} className="chat-member" title={m.title}>
            {m.cover_url ? <img src={m.cover_url} alt="" /> : <span className="noart" />}
            <span>@{m.username}</span>
          </Link>
        ))}
      </div>
      <ChatLog me={me} roomKey={key} people={members} placeholder={t("Say something about {name}…", { name: room.creator })}
        empty={t("Nobody has said anything yet tonight. Start with what you have on, and why.")} />
    </section>
  );
}

/** A live chat: the messages, a box to write in, and the tap-a-message menu. Used by tonight's rooms and clubs. */
export function ChatLog({ me, roomKey, people, placeholder, empty, canModerate = false, onSent }: {
  me: Profile;
  roomKey: string;
  people: { user_id: string; username: string; title?: string | null }[];
  placeholder: string;
  empty: string;
  /** A club's hosts can delete anyone's message. */
  canModerate?: boolean;
  /** After a message goes out (a club tells its members). */
  onSent?: () => void;
}) {
  const { guest } = useAuth();
  const t = useT();
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
    onSent?.();
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

      {guest ? <GuestCantWrite /> : (
        <form className="chat-send" onSubmit={(e) => { e.preventDefault(); void send(); }}>
          <input type="text" value={draft} maxLength={500} placeholder={placeholder} enterKeyHint="send"
            onChange={(e) => setDraft(e.target.value)} aria-label={t("Message")} />
          <button className="btn" type="submit" disabled={busy || !draft.trim()}>{t("Send")}</button>
        </form>
      )}
      <p className="msg err" aria-live="polite">{error}</p>

      {picked && (
        <MessageSheet me={me} message={picked} username={nameOf(picked.author)} kind="chat" moderate={canModerate}
          onClose={() => setPicked(null)} onChanged={() => { setPicked(null); void load(); }} />
      )}
    </>
  );
}

/** Tap a message: write privately, swap keys, report it, or block the person. Your own: delete it. */
export function MessageSheet({ me, message, username, kind, onClose, onChanged, moderate = false }: {
  me: Profile;
  message: { id: string; body: string; author?: string; sender?: string };
  username: string;
  kind: "chat" | "dm";
  onClose: () => void;
  onChanged: () => void;
  /** A club host looking at someone else's message: they can delete it for everyone. */
  moderate?: boolean;
}) {
  const t = useT();
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
      setNote(rel === "friends" ? t("You and @{name} have swapped keys.", { name: username }) : t("Asked @{name} to swap keys. Their room opens to you when they say yes.", { name: username }));
    } catch {
      setNote(t("Couldn't ask right now. Try again."));
    }
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    await supabase().from(kind === "chat" ? "chat_messages" : "direct_messages").delete().eq("id", message.id);
    setBusy(false);
    onChanged();
  }

  async function removeForEveryone() {
    setBusy(true);
    const { data, error } = await supabase().from("chat_messages").delete().eq("id", message.id).select("id");
    setBusy(false);
    if (error || !data?.length) return setNote(t("Couldn't delete it. Try again."));
    onChanged();
  }

  async function report() {
    if (!reason.trim()) return setNote(t("Say what's wrong in a few words."));
    setBusy(true);
    const err = await reportMessage(kind, message.id, reason);
    setBusy(false);
    setNote(err ? t(err) : t("Thanks for telling us. We look at every report within a day."));
    if (!err) setMode("menu");
  }

  async function block() {
    setBusy(true);
    const err = await blockPerson(me.id, author);
    setBusy(false);
    if (err) return setNote(t(err));
    onChanged();
    if (kind === "dm") router.push("/messages");
  }

  return (
    <Sheet onClose={onClose} label={t("Message")}>
      <blockquote className="sheet-quote">&ldquo;{message.body}&rdquo;</blockquote>
      {mode === "menu" && (
        <div className="stack">
          {mine ? (
            <button className="btn ghost danger-text" type="button" disabled={busy} onClick={remove}>{t("Delete my message")}</button>
          ) : (
            <>
              {kind === "chat" && <Link className="btn" href={`/messages?with=${encodeURIComponent(username)}`}>{t("Write to @{name} privately", { name: username })}</Link>}
              <button className="btn ghost" type="button" disabled={busy} onClick={swapKeys}>{t("Swap keys with @{name}", { name: username })}</button>
              <Link className="btn ghost" href={`/r/${username}`}>{t("See @{name}'s room", { name: username })}</Link>
              {moderate && kind === "chat" && (
                <button className="btn ghost danger-text" type="button" disabled={busy} onClick={removeForEveryone}>{t("Delete this message for everyone")}</button>
              )}
              <button className="btn ghost" type="button" onClick={() => setMode("report")}>{t("Report this message")}</button>
              <button className="btn ghost danger-text" type="button" onClick={() => setMode("block")}>{t("Block @{name}", { name: username })}</button>
            </>
          )}
          <p className="msg ok" aria-live="polite">{note}</p>
        </div>
      )}
      {mode === "report" && (
        <div className="stack">
          <div className="field">
            <label htmlFor="report-msg">{t("What's wrong?")}</label>
            <textarea id="report-msg" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder={t("Something offensive, harassment, spam…")} />
            <span className="hint">{t("We look at every report within a day. @{name} won't see who reported.", { name: username })}</span>
          </div>
          <p className="msg err">{note}</p>
          <div className="row">
            <button className="btn ghost" type="button" onClick={() => setMode("menu")}>{t("Back")}</button>
            <button className="btn" type="button" disabled={busy} onClick={report}>{busy ? t("Sending…") : t("Send report")}</button>
          </div>
        </div>
      )}
      {mode === "block" && (
        <div className="stack">
          <p>{t("You won't see each other's messages or rooms anymore, and they can't write to you. They aren't told.")}</p>
          <p className="msg err">{note}</p>
          <div className="row">
            <button className="btn ghost" type="button" onClick={() => setMode("menu")}>{t("Back")}</button>
            <button className="btn danger-solid" type="button" disabled={busy} onClick={block}>{busy ? t("Blocking…") : t("Block @{name}", { name: username })}</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
