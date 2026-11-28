"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localTimeZone, meetingWhen } from "@/lib/club-time";
import {
  addNote, answerMeeting, cancelMeeting, clubPinned, finishReading, nextMeeting, readingNotes, readingNow, removeNote, saveMeeting,
  setClubPin, setProgress, startReading, updateReading,
  type ClubNote, type Meeting, type PartWord, type Pinned, type Reading, type ReadingKind, type Rsvp,
} from "@/lib/clubs";
import { dateLocale, useT } from "@/lib/i18n";
import { filmDetails, searchBooks, searchFilms, type Found } from "@/lib/lookup";
import { notifyClub } from "@/lib/push";
import { LinkedText } from "./linked-text";
import { SearchPicker } from "./search-picker";
import { Sheet } from "./sheet";

/* eslint-disable @next/next/no-img-element -- book covers from Open Library, film posters from TMDB */

/*
 * What a book club needs between meetings, and nothing more:
 *   From the host — one pinned note at the top (what's next, a change of plan), so it doesn't get lost in the chat.
 *   Next meeting — when and where, who's coming, add it to your calendar. Reminded the day before.
 *   Now reading / Now watching — the book or film, how far you are, and notes that stay folded until you get there:
 *   by chapter for a book; by minute for a film, where Watch along runs a clock from when you press play.
 */

type Person = { user_id: string; username: string };

// ---------------------------------------------------------------------------
// From the host: one pinned note
// ---------------------------------------------------------------------------

export function ClubPin({ clubId, isHost, refresh = 0 }: { clubId: string; isHost: boolean; refresh?: number }) {
  const t = useT();
  const [pinned, setPinned] = useState<Pinned | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => setPinned(await clubPinned(clubId)), [clubId]);
  useEffect(() => { void load(); }, [load, refresh]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open

  if (pinned === undefined) return null;
  if (!pinned && !isHost) return null;

  return (
    <section className={`hub-section club-pin${pinned ? "" : " hub-empty"}`} aria-label={t("From the host")}>
      <div className="tonight-head">
        <h2>{pinned ? <><span aria-hidden="true">📌 </span>{t("From the host")}</> : t("A note for everyone")}</h2>
        {isHost && <button className="btn ghost small" type="button" onClick={() => setEditing(true)}>{pinned ? t("Change") : t("Write one")}</button>}
      </div>
      {pinned && (
        <>
          <p className="club-pin-note"><LinkedText text={pinned.note} /></p>
          <p className="muted club-pin-who">{pinned.by_username ? `@${pinned.by_username} · ` : ""}{pinnedWhen(pinned.pinned_at, t)}</p>
        </>
      )}
      {editing && (
        <PinSheet clubId={clubId} current={pinned?.note ?? ""} onClose={() => setEditing(false)}
          onDone={(told) => { setEditing(false); void load(); if (told) void notifyClub(clubId, "pin"); }} />
      )}
    </section>
  );
}

function pinnedWhen(iso: string, t: ReturnType<typeof useT>): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
  return days < 1 ? t("today") : days === 1 ? t("yesterday") : new Date(iso).toLocaleDateString(dateLocale(), { month: "short", day: "numeric" });
}

function PinSheet({ clubId, current, onClose, onDone }: { clubId: string; current: string; onClose: () => void; onDone: (told: boolean) => void }) {
  const t = useT();
  const [note, setNote] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(text: string) {
    setBusy(true);
    const err = await setClubPin(clubId, text);
    setBusy(false);
    if (err) return setError(t(err));
    onDone(Boolean(text.trim()) && text.trim() !== current.trim());
  }

  return (
    <Sheet onClose={onClose} onSubmit={() => save(note)} label={t("A note for everyone")}>
      <h2>{t("A note for everyone")}</h2>
      <p className="muted">{t("It stays at the top of the club until you change it. Members get one nudge.")}</p>
      <div className="field">
        <label htmlFor="pin-note" className="sr-only">{t("Note")}</label>
        <textarea id="pin-note" rows={4} maxLength={600} autoFocus value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={t("Next book is Middlemarch. We meet upstairs this time, not the back room.")} />
      </div>
      <p className="msg err" aria-live="polite">{error}</p>
      <div className="row">
        {current && <button className="btn ghost danger" type="button" disabled={busy} onClick={() => save("")}>{t("Take it down")}</button>}
        <button className="btn ghost" type="button" onClick={onClose}>{t("Close")}</button>
        <button className="btn" type="submit" disabled={busy || !note.trim()}>{busy ? t("Saving…") : t("Pin it")}</button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Next meeting
// ---------------------------------------------------------------------------

export function ClubMeeting({ clubId, clubName, me, isHost }: { clubId: string; clubName: string; me: string; isHost: boolean }) {
  const t = useT();
  const [meeting, setMeeting] = useState<Meeting | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => setMeeting(await nextMeeting(clubId)), [clubId]);
  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open

  async function answer(a: Rsvp) {
    if (!meeting || busy) return;
    setBusy(true);
    setMeeting({ ...meeting, my_answer: a });
    setFailed(!(await answerMeeting(meeting.id, me, a)));
    setBusy(false);
    void load();
  }

  if (meeting === undefined) return null;
  // Members don't see an empty box; hosts get one line to plan the first meeting.
  if (!meeting && !isHost) return null;

  return (
    <section className={`hub-section meeting${meeting ? "" : " hub-empty"}`} aria-label={t("Next meeting")}>
      <div className="tonight-head">
        <h2>{t("Next meeting")}</h2>
        {isHost && <button className="btn ghost small" type="button" onClick={() => setEditing(true)}>{meeting ? t("Change") : t("Plan one")}</button>}
      </div>

      {meeting ? (
        <>
          <p className="meeting-when">{meetingWhen(meeting.starts_at, undefined, dateLocale())}</p>
          {(meeting.place || meeting.link) && (
            <p className="meeting-where">
              {meeting.place}
              {meeting.link && <>{meeting.place ? " · " : ""}<a href={meeting.link} target="_blank" rel="noopener noreferrer">{t("Join the call")} ↗</a></>}
            </p>
          )}
          {meeting.note && <p className="muted meeting-note">{meeting.note}</p>}
          <MeetingPrep meeting={meeting} />

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
          {failed && <p className="msg err">{t("Couldn't save your answer. Try again.")}</p>}
          <button type="button" className="linkish" onClick={() => downloadIcs(meeting, clubName)}>{t("Add to my calendar")}</button>
        </>
      ) : null}

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
  const [questions, setQuestions] = useState(meeting?.questions ?? "");
  const [guide, setGuide] = useState(meeting?.guide_url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const when = new Date(`${date}T${time}`);
    if (Number.isNaN(when.getTime())) return setError(t("Pick a date and a time."));
    if (when.getTime() < Date.now() - 60e3) return setError(t("That's in the past."));
    const url = link.trim();
    if (url && !/^https:\/\/\S+$/.test(url)) return setError(t("A video link starts with https://"));
    const guideUrl = guide.trim();
    if (guideUrl && !/^https:\/\/\S+$/.test(guideUrl)) return setError(t("A reading guide link starts with https://"));
    setBusy(true);
    const iso = when.toISOString();
    const draft = { starts_at: iso, place: place.trim(), link: url || null, note: note.trim(), tz: localTimeZone() };
    // Questions and a guide only when there are some, so a club still saves meetings before the update is in.
    const extra = questions.trim() || guideUrl || meeting?.questions || meeting?.guide_url
      ? { questions: questions.trim(), guide_url: guideUrl || null } : {};
    const err = await saveMeeting(clubId, me, { ...draft, ...extra }, meeting?.id);
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
      <div className="meeting-fields">
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
      <details className="meeting-more" open={Boolean(questions || guide)}>
        <summary>{t("Discussion questions and a reading guide")}</summary>
        <div className="field">
          <label htmlFor="m-questions">{t("Questions (one per line)")}</label>
          <textarea id="m-questions" rows={4} maxLength={2000} value={questions} onChange={(e) => setQuestions(e.target.value)}
            placeholder={t("Who do you trust most by the end?\nWhat would you have done in her place?")} />
        </div>
        <div className="field">
          <label htmlFor="m-guide">{t("Reading guide link")}</label>
          <input id="m-guide" type="url" inputMode="url" maxLength={500} placeholder="https://" value={guide} onChange={(e) => setGuide(e.target.value)} />
        </div>
      </details>
      <p className="msg err" aria-live="polite">{error}</p>
      <div className="row">
        {meeting && <button className="btn ghost danger" type="button" disabled={busy} onClick={cancel}>{t("Cancel the meeting")}</button>}
        <button className="btn ghost" type="button" onClick={onClose}>{t("Close")}</button>
        <button className="btn" type="submit" disabled={busy}>{busy ? t("Saving…") : meeting ? t("Save") : t("Tell the club")}</button>
      </div>
    </Sheet>
  );
}

/** The questions for the evening, folded until you want them, and the reading guide. */
function MeetingPrep({ meeting }: { meeting: Meeting }) {
  const t = useT();
  const questions = (meeting.questions ?? "").split("\n").map((q) => q.trim()).filter(Boolean);
  if (!questions.length && !meeting.guide_url) return null;
  return (
    <div className="meeting-prep">
      {questions.length > 0 && (
        <details>
          <summary>{questions.length === 1 ? t("1 question for the evening") : t("{n} questions for the evening", { n: questions.length })}</summary>
          <ol>{questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
        </details>
      )}
      {meeting.guide_url && <a href={meeting.guide_url} target="_blank" rel="noopener noreferrer">{t("Reading guide")} ↗</a>}
    </div>
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
    `DESCRIPTION:${esc([m.note, m.link, m.questions, m.guide_url].filter(Boolean).join("\n"))}`,
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
// Now reading / Now watching
// ---------------------------------------------------------------------------

const WORDS: PartWord[] = ["chapter", "part", "section", "episode"];

/** 54 → "0:54", 125 → "2:05". */
const hm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
/** 145 → "2 h 25 min", 50 → "50 min". */
const runtime = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}` : `${min} min`);

export function ClubReading({ clubId, me, isHost, people, onShelved }: {
  clubId: string; me: string; isHost: boolean; people: Person[]; onShelved: () => void;
}) {
  const t = useT();
  const [reading, setReading] = useState<Reading | null | undefined>(undefined);
  const [notes, setNotes] = useState<ClubNote[]>([]);
  const [starting, setStarting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

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
      <section className="hub-section reading hub-empty" aria-label={t("Read or watch together")}>
        <div className="tonight-head">
          <h2>{t("Read or watch together")}</h2>
          <button className="btn ghost small" type="button" onClick={() => setStarting(true)}>{t("Choose")}</button>
        </div>
        {starting && <StartReadingSheet clubId={clubId} me={me} onClose={() => setStarting(false)}
          onDone={() => { setStarting(false); void load(); void notifyClub(clubId, "reading"); }} />}
      </section>
    );
  }

  const r = reading;
  const film = r.kind === "film";
  const word = (n: number) => (film ? hm(n) : `${t(r.part_word[0].toUpperCase() + r.part_word.slice(1))} ${n}`);
  const done = r.my_part >= r.parts;

  async function move(part: number) {
    const p = Math.max(0, Math.min(r.parts, Math.round(part)));
    if (p === r.my_part) return;
    setBusy(true);
    setReading({ ...r, my_part: p });
    setFailed(!(await setProgress(r.id, me, p)));
    setBusy(false);
    void load();
  }

  async function finish() {
    const ask = film
      ? t("Mark “{title}” as watched? It goes on the shelf, and every note opens up for everyone.", { title: r.title })
      : t("Mark “{title}” as finished? It goes on the shelf, and every note opens up for everyone.", { title: r.title });
    if (!window.confirm(ask)) return;
    setBusy(true);
    await finishReading(r.id, true);
    setBusy(false);
    onShelved();
    void load();
  }

  const byPart = new Map<number, ClubNote[]>();
  for (const n of notes) byPart.set(n.part, [...(byPart.get(n.part) ?? []), n]);
  const heading = film ? t("Now watching") : t("Now reading");

  return (
    <section className="hub-section reading" aria-label={heading}>
      <div className="tonight-head">
        <h2>{heading}</h2>
        {isHost && <button className="btn ghost small" type="button" onClick={() => setEditing(true)}>{t("Edit")}</button>}
      </div>

      <div className="reading-book">
        <span className={`hub-cover ${film ? "t-film" : "t-book"} m`}>
          {r.cover_url ? <img src={r.cover_url} alt="" loading="lazy" /> : <span className="hub-cover-title">{r.title}</span>}
        </span>
        <div>
          <b className="reading-title">{r.title}</b>
          {r.subtitle && <span className="muted">{r.subtitle}</span>}
          {film && <span className="muted">{runtime(r.parts)}</span>}
          {r.due_on && <span className="mono muted reading-due">{t(film ? "Watch by {date}" : "Read by {date}", { date: new Date(`${r.due_on}T12:00`).toLocaleDateString(dateLocale(), { day: "numeric", month: "long" }) })}</span>}
          <span className="muted">{r.finished
            ? t(film ? "{n} of {m} have watched it" : "{n} of {m} reading have finished", { n: r.finished, m: Math.max(r.readers, r.finished) })
            : r.readers ? t(film ? "{n} watching" : "{n} reading", { n: r.readers }) : ""}</span>
        </div>
      </div>

      {film ? (
        watching
          ? <WatchAlong reading={r} me={me} notes={notes} nameOf={nameOf} onProgress={move} onPosted={load} onClose={() => { setWatching(false); void load(); }} />
          : (
            <div className="field reading-where">
              <label htmlFor="watched-to">{t("Where are you?")}</label>
              <div className="row watched-row">
                <input id="watched-to" key={r.my_part} type="number" min={0} max={r.parts} inputMode="numeric" defaultValue={r.my_part} disabled={busy}
                  onBlur={(e) => move(Number(e.target.value) || 0)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }} aria-describedby="watched-hint" />
                <span id="watched-hint" className="muted">{t("minutes watched")}</span>
                {!done && <button className="btn ghost small" type="button" disabled={busy} onClick={() => move(r.parts)}>{t("Finished it")}</button>}
              </div>
              <span className="reading-bar" aria-hidden="true"><i style={{ width: `${(r.my_part / r.parts) * 100}%` }} /></span>
              {failed && <span className="msg err">{t("Couldn't save where you are. Try again.")}</span>}
              {!done && <button className="btn small watch-along-btn" type="button" onClick={() => setWatching(true)}>▶︎ {t("Watch along")}</button>}
            </div>
          )
      ) : (
        <div className="field reading-where">
          <label htmlFor="where-am-i">{t("Where are you?")}</label>
          <select id="where-am-i" value={r.my_part} disabled={busy} onChange={(e) => move(Number(e.target.value))}>
            <option value={0}>{t("Haven't started")}</option>
            {Array.from({ length: r.parts - 1 }, (_, i) => <option key={i + 1} value={i + 1}>{t("Read up to {where}", { where: word(i + 1).toLocaleLowerCase() })}</option>)}
            <option value={r.parts}>{t("Finished it")}</option>
          </select>
          <span className="reading-bar" aria-hidden="true"><i style={{ width: `${(r.my_part / r.parts) * 100}%` }} /></span>
          {failed && <span className="msg err">{t("Couldn't save where you are. Try again.")}</span>}
        </div>
      )}

      {!watching && (
        <>
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
            {!notes.length && !r.notes_ahead && r.my_part > 0 && <p className="muted">{t("No notes yet. Write the first one about where you are.")}</p>}
          </div>

          {r.my_part > 0
            ? <NoteComposer reading={r} me={me} word={word} at={film ? r.my_part : undefined} onPosted={load} />
            : <p className="muted">{film ? t("Say how far you've watched, or tap Watch along, to read and write notes.") : t("Say where you are to read and write notes.")}</p>}
        </>
      )}

      {isHost && !watching && <button className="btn ghost small reading-finish" type="button" disabled={busy} onClick={finish}>{film ? t("We've watched it") : t("We've finished the book")}</button>}
      {done && !isHost && <p className="muted">{film ? t("You've watched it. Every note is open to you now.") : t("You've finished. Every note is open to you now.")}</p>}

      {editing && <EditReadingSheet reading={r} onClose={() => setEditing(false)} onDone={() => { setEditing(false); void load(); }} />}
    </section>
  );
}

/**
 * Watch along: tap Sync the moment you press play on your TV. A clock runs with the film; members' notes appear
 * at their minute, never ahead. What you write is pinned to the minute you're at, and how far you've got saves as you go.
 */
function WatchAlong({ reading, me, notes, nameOf, onProgress, onPosted, onClose }: {
  reading: Reading; me: string; notes: ClubNote[]; nameOf: Map<string, string>;
  onProgress: (minute: number) => Promise<void>; onPosted: () => void; onClose: () => void;
}) {
  const t = useT();
  // Seconds into the film; null until synced.
  const [anchor, setAnchor] = useState<{ at: number; from: number } | null>(null);
  const [paused, setPaused] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const saved = useRef(reading.my_part);
  const end = reading.parts * 60;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secs = paused ?? (anchor ? Math.min(end, anchor.from + (now - anchor.at) / 1000) : reading.my_part * 60);
  const minute = Math.floor(secs / 60);

  // Save progress each new minute (the server opens notes up to there), and refresh what's visible.
  useEffect(() => {
    if (!anchor || minute <= saved.current) return;
    saved.current = minute;
    void onProgress(minute).then(onPosted);
  }, [anchor, minute, onProgress, onPosted]);

  const sync = (from: number) => { setAnchor({ at: Date.now(), from }); setPaused(null); };
  const nudge = (d: number) => { const s = Math.max(0, Math.min(end, secs + d)); if (paused != null) setPaused(s); else sync(s); };

  // Notes up to this second, newest first.
  const visible = notes.filter((n) => n.part * 60 <= secs + 59).sort((a, b) => b.part - a.part || b.created_at.localeCompare(a.created_at));
  const clock = `${Math.floor(secs / 3600)}:${String(Math.floor((secs % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(secs % 60)).padStart(2, "0")}`;

  return (
    <div className="watch-along" aria-label={t("Watch along")}>
      {!anchor ? (
        <div className="watch-sync">
          <button className="btn sync-btn" type="button" onClick={() => sync(reading.my_part * 60)}>
            {reading.my_part > 0 ? t("Sync from {time}", { time: hm(reading.my_part) }) : t("Sync")}
          </button>
          <p className="muted">{reading.my_part > 0 ? t("Tap when you press play at {time}.", { time: hm(reading.my_part) }) : t("Tap at the same moment you press play on your TV.")}</p>
          {reading.my_part > 0 && <button type="button" className="linkish" onClick={() => sync(0)}>{t("Start from the beginning")}</button>}
        </div>
      ) : (
        <>
          <div className="watch-clock">
            <b className="mono">{clock}</b>
            <span className="row">
              <button className="btn ghost small" type="button" onClick={() => nudge(-10)} aria-label={t("Back 10 seconds")}>−10s</button>
              <button className="btn ghost small" type="button" onClick={() => (paused != null ? sync(paused) : setPaused(secs))}>{paused != null ? t("Play") : t("Pause")}</button>
              <button className="btn ghost small" type="button" onClick={() => nudge(10)} aria-label={t("Forward 10 seconds")}>+10s</button>
            </span>
          </div>
          <p className="muted watch-lock">{t("Notes appear as you reach them. Nothing past {time} is shown.", { time: hm(minute) })}</p>
          <NoteComposer reading={{ ...reading, my_part: Math.max(1, minute) }} me={me} word={hm} at={Math.max(1, minute)} onPosted={onPosted} />
          <div className="notes live">
            {visible.map((n) => (
              <p key={n.id} className="note-line"><span className="mono muted">{hm(n.part)}</span> <b>@{nameOf.get(n.author) ?? "…"}</b> {n.body}</p>
            ))}
            {!visible.length && <p className="muted">{t("No notes here yet. Whoever watches next will see yours at this minute.")}</p>}
          </div>
        </>
      )}
      <button type="button" className="linkish" onClick={onClose}>{t("Stop watching along")}</button>
    </div>
  );
}

function NoteComposer({ reading, me, word, at, onPosted }: {
  reading: Reading; me: string; word: (n: number) => string; at?: number; onPosted: () => void;
}) {
  const t = useT();
  const [body, setBody] = useState("");
  const [chosen, setChosen] = useState(Math.min(reading.my_part, reading.parts));
  const part = at ?? chosen; // A film note is pinned to the minute you're at.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(e?: React.FormEvent) {
    e?.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    const err = await addNote(reading.id, me, Math.max(1, Math.min(reading.parts, part)), body);
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
        {at == null ? (
          <select value={chosen} onChange={(e) => setChosen(Number(e.target.value))} aria-label={t("Which chapter it's about")}>
            {Array.from({ length: Math.min(reading.my_part, reading.parts) }, (_, i) => <option key={i + 1} value={i + 1}>{word(i + 1)}</option>)}
          </select>
        ) : <span className="mono muted">{t("At {time}", { time: word(part) })}</span>}
        <button className="btn small" type="submit" disabled={busy || !body.trim()}>{t("Post")}</button>
      </div>
      <p className="msg err" aria-live="polite">{error}</p>
    </form>
  );
}

function StartReadingSheet({ clubId, me, onClose, onDone }: { clubId: string; me: string; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [kind, setKind] = useState<ReadingKind>("book");
  const [item, setItem] = useState<Found | null>(null);
  const [parts, setParts] = useState(12);
  const [partWord, setPartWord] = useState<PartWord>("chapter");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const film = kind === "film";

  function switchKind(k: ReadingKind) {
    setKind(k);
    setItem(null);
    setParts(k === "film" ? 120 : 12);
    setPartWord(k === "film" ? "minute" : "chapter");
  }

  async function pick(f: Found) {
    setItem(f);
    if (!film || f.id.startsWith("hand-")) return;
    // The film's running time (so minutes line up with the film), and its director for the card.
    const d = await filmDetails(f.id).catch(() => null);
    if (d?.runtime) setParts(Math.min(300, d.runtime));
    if (d?.subtitle) setItem({ ...f, subtitle: d.subtitle, link: d.link ?? f.link });
  }

  async function start() {
    if (!item) return;
    setBusy(true);
    const err = await startReading(clubId, me, item, Math.max(1, Math.min(300, parts)), partWord, due || null, kind);
    setBusy(false);
    if (err) return setError(t(err));
    onDone();
  }

  return (
    <Sheet onClose={onClose} onSubmit={start} label={t("Choose")}>
      <h2>{film ? t("What are you watching?") : t("What are you reading?")}</h2>
      <div className="chips">
        <button type="button" className="chip" aria-pressed={!film} onClick={() => switchKind("book")}>{t("Book")}</button>
        <button type="button" className="chip" aria-pressed={film} onClick={() => switchKind("film")}>{t("Film")}</button>
      </div>
      {item ? (
        <div className="hub-picked one">
          <span className={`hub-cover ${film ? "t-film" : "t-book"} s`}>{item.cover_url ? <img src={item.cover_url} alt="" /> : <span className="hub-cover-title">{item.title}</span>}</span>
          <span><b>{item.title}</b>{item.subtitle && <span className="muted"> · {item.subtitle}</span>}</span>
          <button type="button" className="btn ghost small" onClick={() => setItem(null)}>{t("Change")}</button>
        </div>
      ) : film ? (
        <SearchPicker key="film" id="watching-search" label={t("Find the film")} placeholder={t("Film or show")} source="TMDB"
          search={searchFilms} manual={{ subtitle: t("Director · year") }} onPick={pick} />
      ) : (
        <SearchPicker key="book" id="reading-search" label={t("Find the book")} placeholder={t("Title or author")} source="Open Library & Apple Books"
          search={searchBooks} manual={{ subtitle: t("Author or publisher") }} onPick={pick} />
      )}
      <div className="meeting-fields">
        <div className="field">
          <label htmlFor="r-parts">{film ? t("Length in minutes") : t("How many")}</label>
          <input id="r-parts" type="number" min={1} max={300} value={parts} onChange={(e) => setParts(Number(e.target.value) || 1)} />
        </div>
        {!film && (
          <div className="field">
            <label htmlFor="r-word">{t("Of what")}</label>
            <select id="r-word" value={partWord} onChange={(e) => setPartWord(e.target.value as PartWord)}>
              {WORDS.map((w) => <option key={w} value={w}>{t(`${w[0].toUpperCase()}${w.slice(1)}s`)}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="r-due">{film ? t("Watch by (optional)") : t("Read by (optional)")}</label>
          <input id="r-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      <p className="muted">{film
        ? t("Everyone can tap Watch along when they press play: notes show up at their minute, never ahead.")
        : t("A pamphlet or a short book can be one or two parts. You can change this later.")}</p>
      <p className="msg err" aria-live="polite">{error}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" type="submit" disabled={busy || !item}>{busy ? t("Saving…") : film ? t("Start watching") : t("Start reading")}</button>
      </div>
    </Sheet>
  );
}

function EditReadingSheet({ reading, onClose, onDone }: { reading: Reading; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const film = reading.kind === "film";
  const [parts, setParts] = useState(reading.parts);
  const [partWord, setPartWord] = useState<PartWord>(reading.part_word);
  const [due, setDue] = useState(reading.due_on ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await updateReading(reading.id, { parts: Math.max(1, Math.min(300, parts)), part_word: partWord, due_on: due || null });
    setBusy(false);
    onDone();
  }

  return (
    <Sheet onClose={onClose} onSubmit={save} label={film ? t("Edit the film") : t("Edit the book")}>
      <h2>{reading.title}</h2>
      <div className="meeting-fields">
        <div className="field">
          <label htmlFor="e-parts">{film ? t("Length in minutes") : t("How many")}</label>
          <input id="e-parts" type="number" min={1} max={300} value={parts} onChange={(e) => setParts(Number(e.target.value) || 1)} />
        </div>
        {!film && (
          <div className="field">
            <label htmlFor="e-word">{t("Of what")}</label>
            <select id="e-word" value={partWord} onChange={(e) => setPartWord(e.target.value as PartWord)}>
              {WORDS.map((w) => <option key={w} value={w}>{t(`${w[0].toUpperCase()}${w.slice(1)}s`)}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="e-due">{film ? t("Watch by (optional)") : t("Read by (optional)")}</label>
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
