"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { shareText, tap } from "@/lib/native";
import type { FriendResult, GridMark, QuizHistory, QuizState } from "@/lib/quiz/types";
import { track } from "@/lib/track";

/*
 * What brings people back to the daily quiz, without pressure:
 * a result grid to share (no spoilers), friends who played, a countdown to tomorrow's quiz,
 * and a calendar of the days you played. No streaks: missing a day costs nothing.
 */

const EMOJI: Record<GridMark, string> = { fast: "🟩", right: "🟨", miss: "⬛" };

/** The lines that get shared: the quiz, the grid, and a link to play it too. */
export function shareLines(state: QuizState, t: ReturnType<typeof useT>): string {
  const a = state.attempt!;
  const head = state.club
    ? `${state.club.emoji} ${t("A {club} quiz", { club: state.club.name })} · ${state.quiz.title}`
    : `Bottega Daily #${state.number} · ${state.quiz.title}`;
  const grid = (state.grid ?? []).map((m) => EMOJI[m]).join("");
  const link = state.club ? `bottegarooms.com/club/${state.club.slug}` : "bottegarooms.com/quiz?via=daily";
  return `${head}\n${grid} ${a.correct}/${state.quiz.count}\n${link}`;
}

/** The grid as squares, the way it will look when shared. */
export function Grid({ marks, small = false }: { marks: GridMark[]; small?: boolean }) {
  const t = useT();
  const label = marks.map((m) => (m === "fast" ? t("quick and right") : m === "right" ? t("right") : t("missed"))).join(", ");
  return (
    <span className={`quiz-grid${small ? " small" : ""}`} role="img" aria-label={label}>
      {marks.map((m, i) => <i key={i} className={m} />)}
    </span>
  );
}

/** Your grid, a one-line key, and the share button. */
export function ResultShare({ state }: { state: QuizState }) {
  const t = useT();
  const [note, setNote] = useState<string | null>(null);
  if (!state.grid?.length || !state.attempt?.done) return null;
  async function share() {
    tap();
    const result = await shareText(shareLines(state, t));
    if (result === "shared" || result === "copied") track("share_link", { detail: `quiz:${state.quiz.id}` });
    setNote(result === "copied" ? t("Copied. Paste it anywhere.") : result === "failed" ? t("Couldn't share. Try again.") : null);
  }
  return (
    <div className="quiz-share">
      <Grid marks={state.grid} />
      <p className="hint">{t("🟩 quick and right · 🟨 right · ⬛ missed")}</p>
      <button className="btn big" type="button" onClick={share}>{t("Share my result")}</button>
      <p className="msg ok" aria-live="polite">{note}</p>
    </div>
  );
}

/** "Next quiz in 5h 12m: The poetry quiz". Daily quizzes change at midnight UTC. */
export function NextQuiz({ next }: { next: string }) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const d = new Date(now);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  const mins = Math.max(1, Math.ceil((midnight - now) / 60_000));
  const h = Math.floor(mins / 60), m = mins % 60;
  const wait = h ? t("{h}h {m}m", { h, m }) : t("{m} minutes", { m });
  return (
    <p className="quiz-next">
      <span className="smallcaps">{t("Next quiz in {wait}", { wait })}</span>
      {next && <b>{next}</b>}
    </p>
  );
}

/** Before you play: who among your friends already did. */
export function FriendsPlayed({ friends }: { friends?: FriendResult[] }) {
  const t = useT();
  const done = (friends ?? []).filter((f) => f.done);
  if (!done.length) return null;
  const first = `@${done[0].username}`;
  const line = done.length === 1 ? t("{a} played today.", { a: first })
    : done.length === 2 ? t("{a} and {b} played today.", { a: first, b: `@${done[1].username}` })
    : t("{a} and {n} friends played today.", { a: first, n: done.length - 1 });
  return <p className="quiz-friends-line">{line} <span className="muted">{t("Play to see how you did against them.")}</span></p>;
}

/** After you play: your friends' results today, you among them. */
export function FriendsToday({ friends, me, count }: { friends?: FriendResult[]; me: { score: number; correct: number; username: string } | null; count: number }) {
  const t = useT();
  const done = (friends ?? []).filter((f) => f.done && f.score != null);
  if (!done.length) {
    return (
      <div className="quiz-board friends">
        <h3>{t("Your friends today")}</h3>
        <p className="muted">{t("None of your friends has played yet. Send them your grid.")}</p>
      </div>
    );
  }
  const rows = [...done.map((f) => ({ username: f.username, score: f.score!, correct: f.correct!, me: false })),
    ...(me ? [{ ...me, me: true }] : [])].sort((a, b) => b.score - a.score);
  return (
    <div className="quiz-board friends">
      <h3>{t("Your friends today")}</h3>
      <ol>
        {rows.map((r, i) => (
          <li key={r.username} className={r.me ? "me" : ""}>
            <span className="rank">{i + 1}</span>
            {r.me ? <span>{t("You")}</span> : <Link href={`/r/${r.username}`}>@{r.username}</Link>}
            <span className="muted">{r.correct}/{count}</span>
            <b>{r.score}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The last four weeks: a square for each day, brighter the more you got right. Plus totals. */
export function QuizDays({ history, count = 7 }: { history?: QuizHistory; count?: number }) {
  const t = useT();
  if (!history || !history.played) return null;
  const byDay = new Map(history.days.map((d) => [d.day, d.correct]));
  const today = new Date();
  const cells = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 27 + i));
    const key = d.toISOString().slice(0, 10);
    return { key, correct: byDay.get(key), today: i === 27 };
  });
  return (
    <section className="quiz-days" aria-label={t("Your days")}>
      <div className="tonight-head"><h2>{t("Your days")}</h2></div>
      <div className="quiz-cal" role="img" aria-label={t("{n} quizzes played in the last four weeks", { n: history.days.length })}>
        {cells.map((c) => (
          <span key={c.key} title={c.correct != null ? `${c.key}: ${c.correct}/${count}` : c.key}
            className={`${c.correct != null ? "played" : ""}${c.today ? " today" : ""}`}
            style={c.correct != null ? { opacity: 0.35 + 0.65 * (c.correct / count) } : undefined} />
        ))}
      </div>
      <p className="quiz-stats">
        <span><b>{history.played}</b> {t("played")}</span>
        <span><b>{history.avgCorrect}</b> {t("right on average")}</span>
        <span><b>{history.best}</b> {t("best score")}</span>
      </p>
      <p className="hint">{t("Miss a day whenever you like: nothing resets.")}</p>
    </section>
  );
}
