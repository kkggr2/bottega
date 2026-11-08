"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { addNote, deleteNote, loadNotes, type Note } from "@/lib/wall";

/*
 * The guestbook under a room: friends leave notes, like a wall.
 * Friends (and the owner) can write; the owner can remove any note, authors their own.
 */
export function Guestbook({ ownerId, ownerName, meId, canWrite }: {
  ownerId: string;
  ownerName: string;
  meId: string;
  canWrite: boolean;
}) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const isOwner = ownerId === meId;

  const load = useCallback(async () => setNotes(await loadNotes(ownerId)), [ownerId]);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on mount
    const sb = supabase();
    const channel = sb.channel(`notes-${ownerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `room_owner=eq.${ownerId}` }, () => load())
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [ownerId, load]);

  async function send() {
    if (!draft.trim()) return;
    setBusy(true);
    const err = await addNote(ownerId, meId, draft);
    setBusy(false);
    if (err) return setMsg(err);
    setDraft("");
    setMsg(null);
    load();
  }

  if (notes === null) return null;
  if (!notes.length && !canWrite) return null;

  return (
    <section className="guestbook" id="guestbook" aria-label="Guestbook">
      <h2>{isOwner ? "Your guestbook" : "Guestbook"}</h2>
      {canWrite && (
        <form className="gb-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label className="sr-only" htmlFor="gb-note">{isOwner ? "Write on your wall" : `Leave a note for @${ownerName}`}</label>
          <textarea id="gb-note" rows={2} maxLength={500} value={draft} enterKeyHint="send"
            placeholder={isOwner ? "Pin a note for friends who visit…" : `Leave @${ownerName} a note…`}
            onChange={(e) => { setDraft(e.target.value); setMsg(null); }} />
          <div className="gb-actions">
            <p className="msg err" aria-live="polite">{msg}</p>
            <button className="btn" type="submit" disabled={busy || !draft.trim()}>{busy ? "Leaving…" : "Leave note"}</button>
          </div>
        </form>
      )}
      {notes.length ? (
        <ul className="gb-notes">
          {notes.map((n) => (
            <li key={n.id} className="gb-note">
              <p>{n.body}</p>
              <div className="gb-meta">
                <a href={`/r/${n.username}`}>@{n.username}</a>
                <span>{new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                {(isOwner || n.author === meId) && (
                  <button className="linkish" type="button" onClick={async () => { await deleteNote(n.id); load(); }}
                    aria-label={`Remove @${n.username}'s note`}>Remove</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No notes yet. {isOwner ? "Friends who visit can leave one here." : "Be the first."}</p>
      )}
    </section>
  );
}
