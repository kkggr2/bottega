"use client";

import { t as tNow, useT } from "@/lib/i18n";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnswerResult, BoardRow, ClubQuizCard, QuizQuestion, QuizState } from "@/lib/quiz/types";
import { supabase } from "@/lib/supabase";
import { askForReviewSoon } from "@/lib/review";
import { track } from "@/lib/track";
import { useAuth } from "./auth";
import { Gate } from "./gate";
import { useRemembered } from "@/lib/remember";
import { myClubs, type MyClub } from "@/lib/clubs";
import { QUIZ_ROOM, usePalette } from "@/lib/room-colors";

/* eslint-disable @next/next/no-img-element -- remote film stills and album covers */

/*
 * The daily quiz: one niche theme, 7 questions (facts, film stills, album close-ups, colour palettes,
 * quotes and emoji), 15–20 seconds each, one try a day.
 * The server times and marks everything; this screen only shows it.
 */

/** Which quiz: today's, or one of a club's own (its link name and the quiz's id). */
export type QuizRef = { club: string; quiz: string } | null;

async function call(method: "GET" | "POST", body?: object, ref: QuizRef = null): Promise<Response> {
  const { data } = await supabase().auth.getSession();
  const url = ref && method === "GET" ? `/api/quiz?club=${encodeURIComponent(ref.club)}&quiz=${encodeURIComponent(ref.quiz)}` : "/api/quiz";
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}) },
    body: body ? JSON.stringify(ref ? { ...body, ...ref } : body) : undefined,
    cache: "no-store",
  });
}

export function QuizScreen({ quizRef = null }: { quizRef?: QuizRef } = {}) {
  return <Gate>{() => <QuizGame quizRef={quizRef} />}</Gate>;
}

type Shown = { picked: number | null; answer: number; correct: boolean; note: string | null; points: number };

export function QuizGame({ quizRef: given = null }: { quizRef?: QuizRef } = {}) {
  const t = useT();
  const clubName = given?.club, quizName = given?.quiz;
  const quizRef = useMemo<QuizRef>(() => (clubName && quizName ? { club: clubName, quiz: quizName } : null), [clubName, quizName]);
  usePalette(QUIZ_ROOM, "quiz");
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
    call("GET", undefined, quizRef).then(async (r) => (r.ok ? setState(await r.json())
      : setError(r.status === 403 ? tNow("This quiz is only for the club's members.") : tNow("Couldn't load the quiz. Try again."))))
      .catch(() => setError(tNow("Can't reach Bottega. Check your connection.")));
  }, [quizRef]);

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
    const r = await call("POST", { action: "answer", index: q.index, choice }, quizRef).catch(() => null);
    setBusy(false);
    if (!r) return setError(t("Can't reach Bottega. Check your connection."));
    const data = (await r.json()) as AnswerResult | { error: string; state: QuizState };
    if ("error" in data) { setPicked(null); setState(data.state); return; }
    setShown({ picked: choice, answer: data.answer, correct: data.correct, note: data.note, points: data.points });
    if (data.state.attempt?.done) {
      track("quiz_done", { detail: `${data.state.quiz.id}:${data.state.attempt.correct}` });
      if (data.state.attempt.correct >= 5) askForReviewSoon();
    }
    // Show right or wrong for a moment; the next question's clock starts after it.
    setTimeout(() => { setShown(null); setPicked(null); setState(data.state); }, 1800);
  }, [state, q, quizRef, t]);

  // Out of time.
  useEffect(() => {
    if (playing && q && !shown && left === 0 && deadline.current && Date.now() >= deadline.current) void answer(null);
  }, [left, playing, q, shown, answer]);

  async function start() {
    setBusy(true);
    const r = await call("POST", { action: "start" }, quizRef).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setError(t("Couldn't start the quiz. Try again."));
    track("quiz_start");
    setState(await r.json());
  }

  if (error) return <section className="quiz"><p className="msg err">{error}</p></section>;
  if (!state) return <p className="loading">{t("Shuffling the questions…")}</p>;

  const { quiz, attempt } = state;
  const done = attempt?.done;

  return (
    <section className="quiz" aria-live="polite">
      {state.club ? (
        <>
          <Link href={`/club/${state.club.slug}`} className="mono muted back">&larr; {state.club.name}</Link>
          <p className="mono muted">{state.club.emoji} {t("A {club} quiz", { club: state.club.name })}</p>
        </>
      ) : (
        <>
          <Link href="/quiz" className="mono muted back">&larr; {t("Quiz room")}</Link>
          <p className="mono muted">{t("Today's quiz")}</p>
        </>
      )}
      <h1>{quiz.title}</h1>

      {!attempt && (
        <div className="quiz-intro">
          <p className="blurb">{quiz.blurb}</p>
          <p className="muted">{state.club ? t("{n} questions: stills, colours, lines and a few facts. 15–20 seconds each, one try each; faster right answers score more.", { n: quiz.count }) : t("{n} questions: stills, colours, lines and a few facts. 15–20 seconds each, one try a day; faster right answers score more.", { n: quiz.count })}</p>
          <button className="btn" type="button" disabled={busy} onClick={start}>{busy ? t("Starting…") : t("Start the quiz")}</button>
        </div>
      )}

      {playing && q && (
        <div className="quiz-q">
          <div className="quiz-top">
            <span className="mono">{t("{i} of {n}", { i: q.index + 1, n: quiz.count })}</span>
            <span className="mono">{t("{n} points", { n: attempt!.score })}</span>
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
            {shown ? (shown.correct ? `${t("Right!")} +${shown.points}` : shown.picked == null ? t("Time's up.") : t("Not quite.")) : " "}
            {shown?.note && <span className="muted"> {shown.note}</span>}
          </p>
        </div>
      )}

      {done && attempt && (
        <div className="quiz-done">
          <p className="quiz-score"><b>{attempt.score}</b> {t("points")}</p>
          <p className="muted">{t("{correct} of {n} right · {s} seconds in all", { correct: attempt.correct, n: quiz.count, s: (attempt.timeMs / 1000).toFixed(1) })}{state.me ? ` · #${state.me.rank} ${state.club ? t("in the club") : t("today")}` : ""}</p>
          {state.next && <p className="muted">{t("Tomorrow:")} <b>{state.next}</b></p>}
        </div>
      )}

      {(done || !attempt) && <Board rows={state.board} me={state.me} club={Boolean(state.club)} count={quiz.count} />}
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

function Board({ rows, me, club = false, count = 7 }: { rows: BoardRow[]; me: BoardRow | null; club?: boolean; count?: number }) {
  const t = useT();
  if (!rows.length) return <p className="muted quiz-empty">{club ? t("Nobody in the club has played yet. Be the first on the board.") : t("No scores yet today. Be the first on the board.")}</p>;
  const showMe = me && !rows.some((r) => r.me);
  return (
    <div className="quiz-board">
      <h3>{club ? t("The club's high scores") : t("Today's high scores")}</h3>
      <ol>
        {rows.map((r) => <Row key={r.username} r={r} count={count} />)}
        {showMe && <><li className="gap" aria-hidden="true">…</li><Row r={me} count={count} /></>}
      </ol>
    </div>
  );
}

function Row({ r, count = 7 }: { r: BoardRow; count?: number }) {
  return (
    <li className={r.me ? "me" : ""}>
      <span className="rank">{r.rank}</span>
      <Link href={`/r/${r.username}`}>@{r.username}</Link>
      <span className="muted">{r.correct}/{count}</span>
      <b>{r.score}</b>
    </li>
  );
}

/** A small card for the library: today's theme, or your score once you've played. */
export function QuizCard() {
  const t = useT();
  const { userId } = useAuth();
  // Today's card shows at once; a remembered card from yesterday is not used.
  const [state, setState] = useRemembered<QuizState | null>(userId ? `quiz-card:${userId}` : null, null,
    (s) => s?.day === new Date().toISOString().slice(0, 10));
  useEffect(() => {
    call("GET").then(async (r) => r.ok && setState(await r.json())).catch(() => {});
  }, [setState]);
  if (!state) return <div className="quiz-hero placeholder" aria-hidden="true" />;
  const a = state.attempt;
  return (
    <Link href="/quiz/today" className={`quiz-hero${a?.done ? " played" : ""}`}>
      <span className="smallcaps">{t("Today's quiz")}</span>
      <b>{state.quiz.title}</b>
      <span className="quiz-hero-blurb">{state.quiz.blurb.replace(/[.!?]$/, "")}</span>
      <span className="quiz-hero-foot">
        {a?.done
          ? <>{t("{score} points · {correct} of {count} right", { score: a.score, correct: a.correct, count: state.quiz.count })}{state.me ? ` · #${state.me.rank} ${t("today")}` : ""}</>
          : a ? <>{t("You started this one · Keep going")}</> : <>{t("{n} questions · About 2 minutes", { n: state.quiz.count })}</>}
        <span className="quiz-hero-go" aria-hidden="true">{a?.done ? t("See the table") : t("Play")}</span>
      </span>
    </Link>
  );
}

/** The Quiz room: today's quiz on the table, then every quiz from your clubs. */
export function QuizRoomScreen() {
  return <Gate>{() => <QuizRoomView />}</Gate>;
}

export function QuizRoomView() {
  const t = useT();
  usePalette(QUIZ_ROOM, "quiz");
  const { userId } = useAuth();
  const [clubs, setClubs] = useRemembered<{ club: MyClub; quizzes: ClubQuizCard[] }[] | null>(userId ? `quiz-clubs:${userId}` : null, null);
  useEffect(() => {
    (async () => {
      const mine = await myClubs();
      const { data } = await supabase().auth.getSession();
      const headers: Record<string, string> = data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
      const lists = await Promise.all(mine.map(async (club) => {
        const res = await fetch(`/api/quiz?club=${encodeURIComponent(club.slug)}`, { headers, cache: "no-store" }).catch(() => null);
        return { club, quizzes: res?.ok ? ((await res.json()) as ClubQuizCard[]) : [] };
      }));
      setClubs(lists.filter((l) => l.quizzes.length));
    })().catch(() => setClubs([]));
  }, [setClubs]);

  return (
    <div className="place">
      <header className="place-head">
        <p className="smallcaps muted">{t("The Quiz room")}</p>
        <h1>{t("Test your taste")}</h1>
        <p className="lede">{t("A new quiz every day for everyone, and your clubs' own.")}</p>
      </header>
      <QuizCard />
      {clubs && clubs.length > 0 && clubs.map(({ club, quizzes }) => (
        <section key={club.id} className="tonight" aria-label={`${club.name} quizzes`}>
          <div className="tonight-head">
            <h2>{club.emoji} {club.name}</h2>
            <Link href={`/club/${club.slug}`} className="btn ghost small">{t("The club")}</Link>
          </div>
          <div className="club-quizzes">
            {quizzes.map((q) => (
              <Link key={q.id} href={`/club/${club.slug}/quiz/${q.id}`} className={`quiz-row${q.mine?.done ? " played" : ""}`}>
                <b>{q.title}</b>
                <span className="muted">
                  {q.mine?.done ? t("{score} points · {correct} of {count} right", { score: q.mine.score, correct: q.mine.correct, count: q.count }) : `${t("{n} questions", { n: q.count })}${q.played ? ` · ${t("{n} played", { n: q.played })}` : ""}`}
                </span>
                <span className="smallcaps quiz-row-go">{q.mine?.done ? t("Played") : t("Play")}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {clubs && clubs.length === 0 && (
        <p className="muted place-note">{t("Clubs get their own quizzes and high score tables. Start one in the Salon, or join one from a friend's link.")}</p>
      )}
    </div>
  );
}
