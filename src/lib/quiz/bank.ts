import "server-only";
import { BOOKS } from "./bank-books";
import { FILM } from "./bank-film";
import { MUSIC } from "./bank-music";
import type { Quiz } from "./bank-types";

/*
 * Every quiz, in the order the days use them: film, music, book, film, … so the theme keeps changing.
 * Add new quizzes to the end of their file; the bank repeats once it runs out.
 * Server-only, because it holds the answers.
 */

function weave(...lists: Quiz[][]): Quiz[] {
  const out: Quiz[] = [];
  for (let i = 0; i < Math.max(...lists.map((l) => l.length)); i++) {
    for (const l of lists) if (l[i]) out.push(l[i]);
  }
  return out;
}

export const BANK: Quiz[] = weave(FILM, MUSIC, BOOKS);
