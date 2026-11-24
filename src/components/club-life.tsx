"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { localTimeZone, meetingWhen } from "@/lib/club-time";
import {
  addNote, answerMeeting, cancelMeeting, finishReading, nextMeeting, readingNotes, readingNow, removeNote, saveMeeting,
  setProgress, startReading, updateReading,
  type ClubNote, type Meeting, type PartWord, type Reading, type Rsvp,
} from "@/lib/clubs";
import { useT } from "@/lib/i18n";
import { searchBooks, type Found } from "@/lib/lookup";
import { notifyClub } from "@/lib/push";
import { SearchPicker } from "./search-picker";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- book covers from Open Library */

/*
 * What a book club needs between meetings, and nothing more:
 *   Next meeting — when and where, who's coming, add it to your calendar. Reminded the day before.
 *   Now reading — the book, how far you are, and notes on each chapter that stay folded until you get there.
 */

type Person = { user_id: string; username: string };

// ---------------------------------------------------------------------------
// Next meeting
// ---------------------------------------------------------------------------

export function ClubMeeting({ clubId, clubName, me, isHost }: { clubId: string; clubName: string; me: string; isHost: boolean }) {
  const t = useT();
  const [meeting, setMeeting] = useState<Meeting | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setMeeting(await nextMeeting(clubId)), [clubId]);
  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open

  async function answer(a: Rsvp) {
    if (!meeting || busy) return;
    setBusy(true);
    setMeeting({ ...meeting, my_answer: a });
    await answerMeeting(meeting.id, me, a);
    setBusy(false);
    void load();
  }

  if (meeting === undefined) return null;
  // Members don't see an empty box; hosts get one line to plan the first meeting.
  if (!meeting && !isHost) return null;

  return (
    <section className="hub-section meeting" aria-label={t("Next meeting")}>
      <div className="tonight-head">
        <h2>{t("Next meeting")}</h2>
        {isHost && <button className="btn ghost small" type="button" onClick={() => setEditing(true)}>{meeting ? t("Change") : t("Plan one")}</button>}
      </div>

      {meeting ? (
        <>
          <p className="meeting-when">{meetingWhen(meeting.starts_at)}</p>
          {(meeting.place || meeting.link) && (
            <p className="meeting-where">
              {meeting.place}
              {meeting.link && <>{meeting.place ? " · " : ""}<a href={meeting.link} target="_blank" rel="noopener noreferrer">{t("Join the call")} ↗</a></>}
            </p>
          )}
          {meeting.note && <p className="muted meeting-note">{meeting.note}</p>}

          <div className="rsvp" role="group" aria-label={t("Are you coming?")}>
            {(["yes", "maybe", "no"] as Rsvp[]).map((a) => (
              <button key={a} type="button" className="chip" aria-pressed={meeting.my_answer === a} disabled={busy} onClick={() => answer(a)}>
                {a === "yes" ? t("Going") : a === "maybe" ? t("Maybe") : t("Can't make it")}
              </button>
            ))}
          </div>
          <p className="muted meeting-who">
            {meeting.going.length
              ? <>{t("{n} going", { n: meeting.going.length })}: {meeting.going.map((u) => `@${u}`).join(", ")}</>
              : t("Nobody has answered yet.")}
            {meeting.maybe > 0 && <> · {t("{n} maybe", { n: meeting.maybe })}</>}
          </p>
          <button type="button" className="linkish" onClick={() => downloadIcs(meeting, clubName)}>{t("Add to my calendar")}</button>
        </>
      ) : (
        <p className="muted">{t("Set a date and a place, and everyone can say if they're coming. They're reminded the day before.")}</p>
      )}

      {editing && (
        <MeetingSheet clubId={clubId} me={me} meeting={meeting ?? null} onClose={() => setEditing(false)}
          onDone={(changedTime) => { setEditing(false); void load(); if (changedTime) void notifyClub(clubId, "meeting"); }} />
      )}
    </section>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function MeetingSheet({ clubId, me, meeting, onClose, onDone }: {
  clubId: string; me: string; meeting: Meeting | null; onClose: () => void; onDone: (changedTime: boolean) => void;
}) {
  const t = useT();
  const start = meeting ? new Date(meeting.starts_at) : nextEvening();
  const [date, setDate] = useState(localDate(start));
  const [time, setTime] = useState(localTime(start));
  const [place, setPlace] = useState(meeting?.place ?? "");
  const [link, setLink] = useState(meeting?.link ?? "");
  const [note, setNote] = useState(meeting?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const when = new Date(`${date}T${time}`);
    if (Number.isNaN(when.getTime())) return setError(t("Pick a date and a time."));
    if (when.getTime() < Date.now() - 60e3) return setError(t("That's in the past."));
    const url = link.trim();
    if (url && !/^https:\/\/\S+$/.test(url)) return setError(t("A video link starts with https://"));
    setBusy(true);
    const iso = when.toISOString();
    const err = await saveMeeting(clubId, me, { starts_at: iso, place: place.trim(), link: url || null, note: note.trim(), tz: localTimeZone() }, meeting?.id);
    setBusy(false);
    if (err) return setError(t(err));
    onDone(!meeting || meeting.starts_at !== iso);
  }

  async function cancel() {
    if (!meeting || !window.confirm(t("Cancel this meeting? Everyone's answers go with it."))) return;
    setBusy(true);
    await cancelMeeting(meeting.id);
    setBusy(false);
    onDone(false);
  }

  return (
    <Sheet onClose={onClose} onSubmit={save} label={meeting ? t("Change the meeting") : t("Plan a meeting")}>
      <h2>{meeting ? t("Change the meeting") : t("Plan a meeting")}</h2>
      <div className="row meeting-fields">
        <div className="field">
          <label htmlFor="m-date">{t("Date")}</label>
          <input id="m-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="m-time">{t("Time")}</label>
          <input id="m-time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="m-place">{t("Where")}</label>
        <input id="m-place" type="text" maxLength={200} placeholder={t("The Crown, upstairs · or Online")} value={place} onChange={(e) => setPlace(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="m-link">{t("Video link (optional)")}</label>
        <input id="m-link" type="url" inputMode="url" maxLength={500} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="m-note">{t("Note (optional)")}</label>
        <textarea id="m-note" rows={2} maxLength={500} placeholder={t("Read up to chapter 12 · bring a snack")} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <p className="msg err" aria-live="polite">{error}</p>
      <div className="row">
        {meeting && <button className="btn ghost danger" type="button" disabled={busy} onClick={cancel}>{t("Cancel the meeting")}</button>}
        <button className="btn ghost" type="button" onClick={onClose}>{t("Close")}</button>
        <button className="btn" type="submit" disabled={busy}>{busy ? t("Saving…") : meeting ? t("Save") : t("Tell the club")}</button>
      </div>
    </Sheet>
  );
}

/** A week from now at 19:00, as a sensible first suggestion. */
function nextEvening(): Date {
  const d = new Date(Date.now() + 7 * 864e5);
  d.setHours(19, 0, 0, 0);
  return d;
}

/** A calendar file for this meeting, so it lands in Apple, Google or Outlook calendars. */
function downloadIcs(m: Meeting, clubName: string) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const start = new Date(m.starts_at);
  const end = new Date(start.getTime() + 2 * 36e5);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bottega//Clubs//EN", "BEGIN:VEVENT",
    `UID:${m.id}@bottegarooms.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(clubName)}`,
    m.place ? `LOCATION:${esc(m.place)}` : "",
    `DESCRIPTION:${esc([m.note, m.link].filter(Boolean).join("\n"))}`,
    m.link ? `URL:${m.link}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${clubName.replace(/[^\w ]+/g, "").trim() || "meeting"}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---------------------------------------------------------------------------
// Now reading
// ---------------------------------------------------------------------------

const WORDS: PartWord[] = ["chapter", "part", "section", "episode"];

export function ClubReading({ clubId, me, isHost, people, onShelved }: {
  clubId: string; me: string; isHost: boolean; people: Person[]; onShelved: () => void;
}) {
  const t = useT();
  const [reading, setReading] = useState<Reading | null | undefined>(undefined);
  const [notes, setNotes] = useState<ClubNote[]>([]);
  const [starting, setStarting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await readingNow(clubId);
    setReading(r);
    setNotes(r ? await readingNotes(r.id) : []);
  }, [clubId]);
  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open

  const nameOf = useMemo(() => new Map(people.map((p) => [p.user_id, p.username])), [people]);

  if (reading === undefined) return null;
  if (!reading) {
    if (!isHost) return null;
    return (
      <section className="hub-section reading" aria-label={t("Now reading")}>
        <div className="tonight-head">
          <h2>{t("Now reading")}</h2>
          <button className="btn small" type="button" onClick={() => setStarting(true)}>{t("Choose the book")}</button>
        </div>
        <p className="muted">{t("Set the book you're reading together. Everyone says how far they are, and notes on each chapter stay folded until they get there, so nobody is spoiled.")}</p>
        {starting && <StartReadingSheet clubId={clubId} me={me} onClose={() => setStarting(false)}
          onDone={() => { setStarting(false); void load(); void notifyClub(clubId, "reading"); }} />}
      </section>
    );
  }

  const r = reading;
  const word = (n: number) => `${t(r.part_word[0].toUpperCase() + r.part_word.slice(1))} ${n}`;
  const done = r.my_part >= r.parts;

  async function move(part: number) {
    setBusy(true);
    setReading({ ...r, my_part: part });
    await setProgress(r.id, me, part);
    setBusy(false);
    void load();
  }

  async function finish() {
    if (!window.confirm(t("Mark “{title}” as finished? It goes on the shelf, and every note opens up for everyone.", { title: r.title }))) return;
    setBusy(true);
    await finishReading(r.id, true);
    setBusy(false);
    onShelved();
    void load();
  }

  const byPart = new Map<number, ClubNote[]>();
  for (const n of notes) byPart.set(n.part, [...(byPart.get(n.part) ?? []), n]);

  return (
    <section className="hub-section reading" aria-label={t("Now reading")}>
      <div className="tonight-head">
        <h2>{t("Now reading")}</h2>
        {isHost && <button className="btn ghost small" type="button" onClick={() => setEditing(true)}>{t("Edit")}</button>}
      </div>

      <div className="reading-book">
        <span className="hub-cover t-book m">
          {r.cover_url ? <img src={r.cover_url} alt="" loading="lazy" /> : <span className="hub-cover-title">{r.title}</span>}
        </span>
        <div>
          <b className="reading-title">{r.title}</b>
          {r.subtitle && <span className="muted">{r.subtitle}</span>}
          {r.due_on && <span className="mono muted reading-due">{t("Read by {date}", { date: new Date(`${r.due_on}T12:00`).toLocaleDateString(undefined, { day: "numeric", month: "long" }) })}</span>}
          <span className="muted">{r.finished ? t("{n} of {m} reading have finished", { n: r.finished, m: Math.max(r.readers, r.finished) }) : r.readers ? t("{n} reading", { n: r.readers }) : ""}</span>
        </div>
      </div>

      <div className="field reading-where">
        <label htmlFor="where-am-i">{t("Where are you?")}</label>
        <select id="where-am-i" value={r.my_part} disabled={busy} onChange={(e) => move(Number(e.target.value))}>
          <option value={0}>{t("Haven't started")}</option>
          {Array.from({ length: r.parts - 1 }, (_, i) => <option key={i + 1} value={i + 1}>{t("Read up to {where}", { where: word(i + 1).toLocaleLowerCase() })}</option>)}
          <option value={r.parts}>{t("Finished it")}</option>
        </select>
        <span className="reading-bar" aria-hidden="true"><i style={{ width: `${(r.my_part / r.parts) * 100}%` }} /></span>
      </div>

      <div className="notes" aria-label={t("Notes")}>
        {[...byPart.entries()].map(([part, list]) => (
          <div key={part} className="notes-part">
            <h3 className="mono muted">{word(part)}</h3>
            {list.map((n) => (
              <p key={n.id} className="note-line">
                <b>@{nameOf.get(n.author) ?? "…"}</b> {n.body}
                {(n.author === me || isHost) && (
                  <button type="button" className="linkish small" onClick={async () => { await removeNote(n.id); void load(); }} aria-label={t("Delete")}>×</button>
                )}
              </p>
            ))}
          </div>
        ))}
        {r.notes_ahead > 0 && (
          <p className="notes-ahead">🔒 {r.notes_ahead === 1 ? t("1 note further on. It opens when you get there.") : t("{n} notes further on. They open when you get there.", { n: r.notes_ahead })}</p>
        )}
        {!notes.length && !r.notes_ahead && <p className="muted">{t("No notes yet. Write the first one about where you are.")}</p>}
      </div>

      {r.my_part > 0
        ? <NoteComposer reading={r} me={me} word={word} onPosted={load} />
        : <p className="muted">{t("Say where you are to read and write notes.")}</p>}

      {isHost && <button className="btn ghost small reading-finish" type="button" disabled={busy} onClick={finish}>{t("We've finished the book")}</button>}
      {done && !isHost && <p className="muted">{t("You've finished. Every note is open to you now.")}</p>}

      {editing && <EditReadingSheet reading={r} onClose={() => setEditing(false)} onDone={() => { setEditing(false); void load(); }} />}
    </section>
  );
}

function NoteComposer({ reading, me, word, onPosted }: { reading: Reading; me: string; word: (n: number) => string; onPosted: () => void }) {
  const t = useT();
  const [body, setBody] = useState("");
  const [part, setPart] = useState(Math.min(reading.my_part, reading.parts));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(e?: React.FormEvent) {
    e?.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    const err = await addNote(reading.id, me, part, body);
    setBusy(false);
    if (err) return setError(t(err));
    setBody("");
    setError(null);
    onPosted();
  }

  return (
    <form className="note-compose" onSubmit={post}>
      <textarea rows={2} maxLength={1000} placeholder={t("A thought about {where}…", { where: word(part).toLocaleLowerCase() })}
        value={body} onChange={(e) => setBody(e.target.value)} aria-label={t("Your note")} />
      <div className="row">
        <select value={part} onChange={(e) => setPart(Number(e.target.value))} aria-label={t("Which chapter it's about")}>
          {Array.from({ length: Math.min(reading.my_part, reading.parts) }, (_, i) => <option key={i + 1} value={i + 1}>{word(i + 1)}</option>)}
        </select>
        <button className="btn small" type="submit" disabled={busy || !body.trim()}>{t("Post")}</button>
      </div>
      <p className="msg err" aria-live="polite">{error}</p>
    </form>
  );
}

function StartReadingSheet({ clubId, me, onClose, onDone }: { clubId: string; me: string; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [book, setBook] = useState<Found | null>(null);
  const [parts, setParts] = useState(12);
  const [partWord, setPartWord] = useState<PartWord>("chapter");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!book) return;
    setBusy(true);
    const err = await startReading(clubId, me, book, Math.max(1, Math.min(200, parts)), partWord, due || null);
    setBusy(false);
    if (err) return setError(t(err));
    onDone();
  }

  return (
    <Sheet onClose={onClose} onSubmit={start} label={t("Choose the book")}>
      <h2>{t("What are you reading?")}</h2>
      {book ? (
        <div className="hub-picked one">
          <span className="hub-cover t-book s">{book.cover_url ? <img src={book.cover_url} alt="" /> : <span className="hub-cover-title">{book.title}</span>}</span>
          <span><b>{book.title}</b>{book.subtitle && <span className="muted"> · {book.subtitle}</span>}</span>
          <button type="button" className="btn ghost small" onClick={() => setBook(null)}>{t("Change")}</button>
        </div>
      ) : (
        <SearchPicker id="reading-search" label={t("Find the book")} placeholder={t("Title or author")} source="Open Library"
          search={searchBooks} manual={{ subtitle: t("Author or publisher") }} onPick={setBook} />
      )}
      <div className="row meeting-fields">
        <div className="field">
          <label htmlFor="r-parts">{t("How many")}</label>
          <input id="r-parts" type="number" min={1} max={200} value={parts} onChange={(e) => setParts(Number(e.target.value) || 1)} />
        </div>
        <div className="field">
          <label htmlFor="r-word">{t("Of what")}</label>
          <select id="r-word" value={partWord} onChange={(e) => setPartWord(e.target.value as PartWord)}>
            {WORDS.map((w) => <option key={w} value={w}>{t(`${w[0].toUpperCase()}${w.slice(1)}s`)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-due">{t("Read by (optional)")}</label>
          <input id="r-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      <p className="muted">{t("A pamphlet or a short book can be one or two parts. You can change this later.")}</p>
      <p className="msg err" aria-live="polite">{error}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" type="submit" disabled={busy || !book}>{busy ? t("Saving…") : t("Start reading")}</button>
      </div>
    </Sheet>
  );
}

function EditReadingSheet({ reading, onClose, onDone }: { reading: Reading; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [parts, setParts] = useState(reading.parts);
  const [partWord, setPartWord] = useState<PartWord>(reading.part_word);
  const [due, setDue] = useState(reading.due_on ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await updateReading(reading.id, { parts: Math.max(1, Math.min(200, parts)), part_word: partWord, due_on: due || null });
    setBusy(false);
    onDone();
  }

  return (
    <Sheet onClose={onClose} onSubmit={save} label={t("Edit the book")}>
      <h2>{reading.title}</h2>
      <div className="row meeting-fields">
        <div className="field">
          <label htmlFor="e-parts">{t("How many")}</label>
          <input id="e-parts" type="number" min={1} max={200} value={parts} onChange={(e) => setParts(Number(e.target.value) || 1)} />
        </div>
        <div className="field">
          <label htmlFor="e-word">{t("Of what")}</label>
          <select id="e-word" value={partWord} onChange={(e) => setPartWord(e.target.value as PartWord)}>
            {WORDS.map((w) => <option key={w} value={w}>{t(`${w[0].toUpperCase()}${w.slice(1)}s`)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="e-due">{t("Read by (optional)")}</label>
          <input id="e-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" type="submit" disabled={busy}>{busy ? t("Saving…") : t("Save")}</button>
      </div>
    </Sheet>
  );
}
