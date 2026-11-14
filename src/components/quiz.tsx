"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AnswerResult, BoardRow, QuizQuestion, QuizState } from "@/lib/quiz/types";
import { supabase } from "@/lib/supabase";
import { askForReviewSoon } from "@/lib/review";
import { track } from "@/lib/track";
import { Gate } from "./gate";

/* eslint-disable @next/next/no-img-element -- remote film stills and album covers */

/*
 * The daily quiz: one niche theme, 7 questions (facts, film stills, album close-ups, colour palettes,
 * quotes and emoji), 15–20 seconds each, one try a day.
 * The server times and marks everything; this screen only shows it.
 */

async function call(method: "GET" | "POST", body?: object): Promise<Response> {
  const { data } = await supabase().auth.getSession();
  return fetch("/api/quiz", {
    method,
    headers: { "Content-Type": "application/json", ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}

export function QuizScreen() {
  return <Gate>{() => <QuizGame />}</Gate>;
}

type Shown = { picked: number | null; answer: number; correct: boolean; note: string | null; points: number };

export function QuizGame() {
  const [state, setState] = useState<QuizState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<Shown | null>(null);
  // The answer you tapped, lit up at once while the server marks it.
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const deadline = useRef(0);
  const sent = useRef(-1);

  useEffect(() => {
    call("GET").then(async (r) => (r.ok ? setState(await r.json()) : setError("Couldn't load today's quiz. Try again.")))
      .catch(() => setError("Can't reach Bottega. Check your connection."));
  }, []);

  const q = state?.question ?? null;
  const playing = Boolean(state?.attempt && !state.attempt.done && q);

  // Each question's clock, from the time the server says is left.
  useEffect(() => {
    if (!playing || !q || shown) return;
    deadline.current = Date.now() + q.remainingMs;
    const tick = () => setLeft(Math.max(0, deadline.current - Date.now()));
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 100);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [playing, q, shown]);

  const answer = useCallback(async (choice: number | null) => {
    if (!state || !q || sent.current === q.index) return;
    sent.current = q.index;
    setPicked(choice);
    setBusy(true);
    const r = await call("POST", { action: "answer", index: q.index, choice }).catch(() => null);
    setBusy(false);
    if (!r) return setError("Can't reach Bottega. Check your connection.");
    const data = (await r.json()) as AnswerResult | { error: string; state: QuizState };
    if ("error" in data) { setPicked(null); setState(data.state); return; }
    setShown({ picked: choice, answer: data.answer, correct: data.correct, note: data.note, points: data.points });
    if (data.state.attempt?.done) {
      track("quiz_done", { detail: `${data.state.quiz.id}:${data.state.attempt.correct}` });
      if (data.state.attempt.correct >= 5) askForReviewSoon();
    }
    // Show right or wrong for a moment; the next question's clock starts after it.
    setTimeout(() => { setShown(null); setPicked(null); setState(data.state); }, 1800);
  }, [state, q]);

  // Out of time.
  useEffect(() => {
    if (playing && q && !shown && left === 0 && deadline.current && Date.now() >= deadline.current) void answer(null);
  }, [left, playing, q, shown, answer]);

  async function start() {
    setBusy(true);
    const r = await call("POST", { action: "start" }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setError("Couldn't start the quiz. Try again.");
    track("quiz_start");
    setState(await r.json());
  }

  if (error) return <section className="quiz"><p className="msg err">{error}</p></section>;
  if (!state) return <p className="loading">Shuffling the questions…</p>;

  const { quiz, attempt } = state;
  const done = attempt?.done;

  return (
    <section className="quiz" aria-live="polite">
      <Link href="/" className="mono muted back">&larr; Library</Link>
      <p className="mono muted">Today&rsquo;s quiz</p>
      <h1>{quiz.title}</h1>

      {!attempt && (
        <div className="quiz-intro">
          <p className="blurb">{quiz.blurb}</p>
          <p className="muted">{quiz.count} questions: stills, colours, lines and a few facts. 15–20 seconds each, one try a day; faster right answers score more.</p>
          <button className="btn" type="button" disabled={busy} onClick={start}>{busy ? "Starting…" : "Start the quiz"}</button>
        </div>
      )}

      {playing && q && (
        <div className="quiz-q">
          <div className="quiz-top">
            <span className="mono">{q.index + 1} of {quiz.count}</span>
            <span className="mono">{attempt!.score} points</span>
          </div>
          <div className="quiz-timer" aria-hidden="true">
            <span style={{ width: `${shown ? 0 : Math.min(100, (left / q.limitMs) * 100)}%`, transition: picked != null ? "none" : undefined }} className={left < 5000 ? "low" : ""} />
          </div>
          <Clue q={q} />
          <h2>{q.text}</h2>
          <div className="quiz-options">
            {q.options.map((o, i) => {
              const cls = shown ? (i === shown.answer ? "right" : i === shown.picked ? "wrong" : "dim")
                : picked != null ? (i === picked ? "picked" : "dim") : "";
              return (
                <button key={i} type="button" className={`quiz-option ${cls}`} disabled={busy || Boolean(shown) || picked != null}
                  onPointerDown={() => { if (picked == null && !shown) navigator.vibrate?.(8); }}
                  onClick={() => answer(i)}>
                  {o}
                </button>
              );
            })}
          </div>
          <p className={`quiz-feedback ${shown ? (shown.correct ? "ok-text" : "err-text") : ""}`}>
            {shown ? (shown.correct ? `Right! +${shown.points}` : shown.picked == null ? "Time's up." : "Not quite.") : " "}
            {shown?.note && <span className="muted"> {shown.note}</span>}
          </p>
        </div>
      )}

      {done && attempt && (
        <div className="quiz-done">
          <p className="quiz-score"><b>{attempt.score}</b> points</p>
          <p className="muted">{attempt.correct} of {quiz.count} right · {(attempt.timeMs / 1000).toFixed(1)} seconds in all{state.me ? ` · #${state.me.rank} today` : ""}</p>
          <p className="muted">Tomorrow: <b>{state.next}</b></p>
        </div>
      )}

      {(done || !attempt) && <Board rows={state.board} me={state.me} />}
    </section>
  );
}

/** What a question shows besides its words: a still, a close-up, colours, a line or emoji. */
export function Clue({ q }: { q: QuizQuestion }) {
  if (q.kind === "still" && q.image) {
    return <div className="clue still"><img src={q.image} alt="A frame from the film" /></div>;
  }
  if (q.kind === "cover" && q.image) {
    const [x, y, z] = q.crop ?? [50, 50, 1.6];
    return (
      <div className="clue cover">
        <img src={q.image} alt="A close-up of the album cover" style={{ transform: `scale(${z})`, transformOrigin: `${x}% ${y}%` }} />
      </div>
    );
  }
  if (q.kind === "palette" && q.palette) {
    return (
      <div className="clue palette" role="img" aria-label={`Five colours: ${q.palette.join(", ")}`}>
        {q.palette.map((c) => <span key={c} style={{ background: c }} />)}
      </div>
    );
  }
  if (q.kind === "quote" && q.quote) return <blockquote className={`clue quote${q.quote.length > 70 ? " long" : ""}`}>&ldquo;{q.quote}&rdquo;</blockquote>;
  if (q.kind === "emoji" && q.emoji) return <p className="clue emoji" aria-label="Emoji clue">{q.emoji}</p>;
  return null;
}

function Board({ rows, me }: { rows: BoardRow[]; me: BoardRow | null }) {
  if (!rows.length) return <p className="muted quiz-empty">No scores yet today. Be the first on the board.</p>;
  const showMe = me && !rows.some((r) => r.me);
  return (
    <div className="quiz-board">
      <h3>Today&rsquo;s high scores</h3>
      <ol>
        {rows.map((r) => <Row key={r.username} r={r} />)}
        {showMe && <><li className="gap" aria-hidden="true">…</li><Row r={me} /></>}
      </ol>
    </div>
  );
}

function Row({ r }: { r: BoardRow }) {
  return (
    <li className={r.me ? "me" : ""}>
      <span className="rank">{r.rank}</span>
      <Link href={`/r/${r.username}`}>@{r.username}</Link>
      <span className="muted">{r.correct}/7</span>
      <b>{r.score}</b>
    </li>
  );
}

/** A small card for the library: today's theme, or your score once you've played. */
export function QuizCard() {
  const [state, setState] = useState<QuizState | null>(null);
  useEffect(() => {
    call("GET").then(async (r) => r.ok && setState(await r.json())).catch(() => {});
  }, []);
  if (!state) return null;
  const a = state.attempt;
  return (
    <Link href="/quiz" className="quiz-card">
      <span className="mono">Today&rsquo;s quiz</span>
      <b>{state.quiz.title}</b>
      <span className="muted">
        {a?.done ? `${a.score} points · ${a.correct}/7${state.me ? ` · #${state.me.rank}` : ""}` : a ? "You started this one. Keep going →" : `${state.quiz.blurb} 7 questions →`}
      </span>
    </Link>
  );
}
