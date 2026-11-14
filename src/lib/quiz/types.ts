/* What the app sees of the daily quiz. Answers never leave the server until you've answered. */

export const QUIZ_LIMIT_MS = 15_000;
export const QUIZ_LENGTH = 7;

export type QuizQuestion = { index: number; text: string; options: string[]; remainingMs: number };

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
};

export type AnswerResult = {
  correct: boolean;
  /** The right option, in the order you saw them. */
  answer: number;
  note: string | null;
  points: number;
  state: QuizState;
};
