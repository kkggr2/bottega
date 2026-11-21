/* What the app sees of the daily quiz. Answers never leave the server until you've answered. */

export const QUIZ_LIMIT_MS = 15_000;
export const QUIZ_LENGTH = 7;

export type QuizKind = "fact" | "still" | "cover" | "palette" | "quote" | "emoji";

/** Picture questions get a little longer, for the picture to load and sink in. */
export const limitFor = (kind: QuizKind): number => (kind === "still" || kind === "cover" || kind === "palette" ? 20_000 : QUIZ_LIMIT_MS);

export type QuizQuestion = {
  index: number;
  text: string;
  options: string[];
  remainingMs: number;
  limitMs: number;
  kind: QuizKind;
  /** A film still or album cover; for a cover, crop = [x%, y%, zoom]. */
  image?: string;
  crop?: [number, number, number];
  palette?: string[];
  quote?: string;
  emoji?: string;
};

export type BoardRow = { rank: number; username: string; score: number; correct: number; timeMs: number; me: boolean };

export type QuizState = {
  day: string;
  quiz: { id: string; title: string; blurb: string; count: number; limitMs: number };
  /** Tomorrow's theme, as a teaser. */
  next: string;
  attempt: null | { done: boolean; index: number; correct: number; score: number; timeMs: number };
  question: QuizQuestion | null;
  board: BoardRow[];
  me: BoardRow | null;
  /** Set for a club's own quiz. */
  club?: { slug: string; name: string; emoji: string };
  /** The daily quiz's number (#1 was 14 November 2026), for sharing. */
  number?: number;
  /** Once you've finished: each question as quick and right, right, or missed (the share grid). */
  grid?: GridMark[];
  /** Friends who played today's quiz. Scores only once you've finished yours. */
  friends?: FriendResult[];
  /** Your days with the daily quiz: the last four weeks, and totals. No streaks. */
  history?: QuizHistory;
};

export type GridMark = "fast" | "right" | "miss";
export type FriendResult = { username: string; done: boolean; score?: number; correct?: number; timeMs?: number };
export type QuizHistory = { days: { day: string; correct: number }[]; played: number; avgCorrect: number; best: number };

/** A quiz on a club's page, with your result if you've played. */
export type ClubQuizCard = {
  id: string; title: string; blurb: string; count: number; played: number;
  mine: { done: boolean; score: number; correct: number } | null;
};

export type AnswerResult = {
  correct: boolean;
  /** The right option, in the order you saw them. */
  answer: number;
  note: string | null;
  points: number;
  state: QuizState;
};
