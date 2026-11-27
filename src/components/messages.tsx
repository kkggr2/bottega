"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ago, chatLayout, clockTime, markRead, myThreads, sendDirect, threadWith, type DirectMessage, type Thread } from "@/lib/chat";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import type { Profile } from "@/lib/types";
import { MessageSheet } from "./chat";
import { SALON, usePalette } from "@/lib/room-colors";
import { Composer } from "./composer";
import { Gate } from "./gate";
import { LinkedText, MessageBubble } from "./linked-text";

/*
 * Private messages. Friends (people you've swapped keys with) write freely. Anyone else can send
 * one message, which arrives as a request; once you reply, you can talk.
 */

export function MessagesScreen() {
  return <Gate>{(me) => <MessagesView me={me} />}</Gate>;
}

export function MessagesView({ me }: { me: Profile }) {
  usePalette(SALON, "salon");
  const params = useSearchParams();
  const withName = params.get("with");
  return withName ? <Conversation me={me} username={withName.toLowerCase()} /> : <Inbox me={me} />;
}

function Inbox({ me }: { me: Profile }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const load = useCallback(() => { myThreads().then(setThreads).catch(() => setThreads([])); }, []);
  useEffect(() => {
    load();
    const sb = supabase();
    const channel = sb.channel(`inbox-${me.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => load())
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [me.id, load]);

  if (!threads) return <p className="loading">Opening your post…</p>;
  const requests = threads.filter((t) => t.is_request);
  const talks = threads.filter((t) => !t.is_request);
  return (
    <section className="chat">
      <Link href="/salon" className="mono muted back">&larr; Salon</Link>
      <h1>Messages</h1>
      {threads.length === 0 && (
        <p className="muted">No messages yet. Tap someone&rsquo;s message in tonight&rsquo;s rooms to write to them privately.</p>
      )}
      {requests.length > 0 && (
        <>
          <h2 className="thread-h">Requests</h2>
          <p className="muted">From people you haven&rsquo;t swapped keys with. Reply to start talking, or just leave it.</p>
          <ThreadList threads={requests} />
        </>
      )}
      {talks.length > 0 && (
        <>
          {requests.length > 0 && <h2 className="thread-h">Conversations</h2>}
          <ThreadList threads={talks} />
        </>
      )}
    </section>
  );
}

function ThreadList({ threads }: { threads: Thread[] }) {
  return (
    <ul className="threads">
      {threads.map((t) => (
        <li key={t.other_id}>
          <Link href={`/messages?with=${encodeURIComponent(t.username)}`} className={t.unread ? "unread" : ""}>
            <b>@{t.username}</b>
            <span className="muted">{t.last_from_me ? "You: " : ""}{t.last_body}</span>
            <span className="when muted">{ago(t.last_at)}{t.unread ? <span className="badge">{t.unread}</span> : null}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Conversation({ me, username }: { me: Profile; username: string }) {
  const [other, setOther] = useState<Profile | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<DirectMessage[]>([]);
  const [friends, setFriends] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<DirectMessage | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase().from("profiles").select("id, username").eq("username", username).maybeSingle()
      .then(({ data }) => setOther((data as Profile | null) ?? null));
  }, [username]);

  const load = useCallback(async () => {
    if (!other) return;
    const [list, { data: f }] = await Promise.all([
      threadWith(me.id, other.id),
      supabase().rpc("are_friends", { a: me.id, b: other.id }),
    ]);
    setMsgs(list);
    setFriends(Boolean(f));
    void markRead(me.id, other.id);
  }, [me.id, other]);

  useEffect(() => {
    if (!other) return;
    void load(); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open
    const sb = supabase();
    const channel = sb.channel(`dm-${me.id}-${other.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => load())
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [me.id, other, load]);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  async function send() {
    if (!other || !draft.trim() || busy) return;
    setBusy(true);
    const err = await sendDirect(me.id, other.id, draft);
    setBusy(false);
    if (err) return setError(err);
    track("dm_send");
    setDraft("");
    setError(null);
    void load();
  }

  if (other === undefined) return <p className="loading">Opening…</p>;
  if (other === null) return <section className="chat"><Link href="/messages" className="mono muted back">&larr; Messages</Link><h1>Nobody called @{username}.</h1></section>;

  const iWrote = msgs.some((m) => m.sender === me.id);
  const theyWrote = msgs.some((m) => m.sender === other.id);
  const waiting = !friends && iWrote && !theyWrote;
  const isRequest = !friends && theyWrote && !iWrote;
  const layout = chatLayout(msgs, (m) => m.sender);

  return (
    <section className="chat">
      <Link href="/messages" className="mono muted back">&larr; Messages</Link>
      <h1><Link href={`/r/${other.username}`} className="plain">@{other.username}</Link></h1>
      {isRequest && <p className="callout">@{other.username} would like to talk. Reply to accept, or tap their message to report or block.</p>}
      {!friends && !iWrote && !theyWrote && <p className="muted">You haven&rsquo;t swapped keys, so your first message arrives as a request. You can write again once they reply.</p>}

      <div className="chat-log">
        {msgs.map((m, i) => {
          const mine = m.sender === me.id;
          const { day, cont } = layout[i];
          return (
            <Fragment key={m.id}>
              {day && <p className="chat-day">{day}</p>}
              <MessageBubble mine={mine} cont={cont} onOpen={() => setPicked(m)}>
                <span className="body"><LinkedText text={m.body} /></span>
                <span className="when muted">{clockTime(m.created_at)}{mine && m.read_at ? " · seen" : ""}</span>
              </MessageBubble>
            </Fragment>
          );
        })}
        <div ref={end} />
      </div>

      {waiting ? (
        <p className="muted">Waiting for @{other.username} to reply.</p>
      ) : (
        <Composer value={draft} onChange={setDraft} onSend={() => void send()} placeholder={`Write to @${other.username}…`} busy={busy} />
      )}
      <p className="msg err" aria-live="polite">{error}</p>

      {picked && (
        <MessageSheet me={me} message={picked} username={other.username} kind="dm"
          onClose={() => setPicked(null)} onChanged={() => { setPicked(null); void load(); }} />
      )}
    </section>
  );
}
