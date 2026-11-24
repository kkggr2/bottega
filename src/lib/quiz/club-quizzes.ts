import "server-only";
import type { Quiz } from "./bank-types";

/*
 * Quizzes written for one club. `club` is the club's link name (bottegarooms.com/join/<club>),
 * or "*" for the starter quiz every club gets. `opens` (YYYY-MM-DD, UTC) keeps a quiz hidden until that day.
 * Ids: lowercase letters, numbers and dashes. Right answers first (a: 0); the server shuffles the
 * options for each person. Picture questions (still, cover, palette) use keys from media.ts.
 *
 * To add one for a club: { club: "gray-fox", quiz: { id: "baldwin", title: "The Baldwin quiz", blurb: "…", qs: [ …7 questions… ] } }
 */
export const CLUB_QUIZZES: { club: string; opens?: string; quiz: Quiz }[] = [
  {
    club: "*",
    quiz: {
      id: "taste-test", title: "The taste test", blurb: "A warm-up for the whole club: films, records, books.",
      qs: [
        { kind: "emoji", emoji: "🦈🚤🏖️", q: "Which film is this?", o: ["Jaws", "The Abyss", "Deep Blue Sea", "Open Water"], a: 0, n: "Spielberg, 1975: the first summer blockbuster." },
        { kind: "quote", quote: "Here's looking at you, kid.", q: "Which film is it from?", o: ["Casablanca", "The Maltese Falcon", "Gone with the Wind", "Roman Holiday"], a: 0 },
        { q: "Which band made OK Computer (1997)?", o: ["Radiohead", "Blur", "Pulp", "Portishead"], a: 0 },
        { kind: "emoji", emoji: "👴🎣🐟🌊", q: "Which book is this?", o: ["The Old Man and the Sea", "Moby-Dick", "Life of Pi", "Treasure Island"], a: 0, n: "Hemingway, 1952." },
        { kind: "quote", quote: "It was the best of times, it was the worst of times", q: "Which novel opens like this?", o: ["A Tale of Two Cities", "Great Expectations", "Bleak House", "Oliver Twist"], a: 0 },
        { q: "Who directed Parasite (2019)?", o: ["Bong Joon-ho", "Park Chan-wook", "Lee Chang-dong", "Hirokazu Kore-eda"], a: 0 },
        { kind: "emoji", emoji: "💜🌧️", q: "Which song is this?", o: ["Purple Rain", "Purple Haze", "Raspberry Beret", "Here Comes the Rain Again"], a: 0, n: "Prince, 1984." },
      ],
    },
  },
  // For Cita Press's reading club, if they start one at bottegarooms.com/join/cita. Every quote is the first line
  // of a book in their open library, checked against their own editions.
  {
    club: "cita",
    quiz: {
      id: "first-lines", title: "Whose first line is it?",
      blurb: "Seven openings from Cita Press's open library. Every book is free to read at citapress.org.",
      qs: [
        { kind: "quote", quote: "It is very seldom that mere ordinary people like John and myself secure ancestral halls for the summer.",
          q: "Whose first line is this?", o: ["Charlotte Perkins Gilman", "Kate Chopin", "Edith Wharton", "Mary Shelley"], a: 0,
          n: "The Yellow Wall-Paper, 1892." },
        { kind: "quote", quote: "A green and yellow parrot, which hung in a cage outside the door, kept repeating over and over: “Allez vous-en! Allez vous-en! Sapristi! That’s all right!”",
          q: "Whose first line is this?", o: ["Kate Chopin", "Elizabeth Gaskell", "Amy Lowell", "Edith Wharton"], a: 0,
          n: "The Awakening, 1899." },
        { kind: "quote", quote: "On the 22d of September I was asked by the World if I could have myself committed to one of the asylums for the insane in New York",
          q: "Whose first line is this?", o: ["Nellie Bly", "Harriet Jacobs", "George Eliot", "Charlotte Perkins Gilman"], a: 0,
          n: "Ten Days in a Mad-House, 1887. The World was the newspaper." },
        { kind: "quote", quote: "I was born a slave; but I never knew it till six years of happy childhood had passed away.",
          q: "Whose first line is this?", o: ["Harriet Jacobs", "Zitkála-Šá", "Sui Sin Far", "Nellie Bly"], a: 0,
          n: "Incidents in the Life of a Slave Girl, 1861." },
        { kind: "quote", quote: "“Has she come?” “No, Mamma, not yet.”",
          q: "Whose first line is this?", o: ["Louisa May Alcott", "Elizabeth Gaskell", "Edith Wharton", "Kate Chopin"], a: 0,
          n: "Behind a Mask, 1866, published under the name A. M. Barnard." },
        { kind: "quote", quote: "It is only four o’clock; but it is winter and the sun has already set",
          q: "Whose first line is this?", o: ["Mary Shelley", "Virginia Woolf", "Vernon Lee", "Elizabeth Gaskell"], a: 0,
          n: "Mathilda, written in 1819–20." },
        { kind: "quote", quote: "…a genus with many species, determined by the particular quality of silliness that predominates in them—the frothy, the prosy, the pious, or the pedantic.",
          q: "Who wrote this, about novels by women?", o: ["George Eliot", "Virginia Woolf", "Vernon Lee", "Mary Shelley"], a: 0,
          n: "Silly Novels by Lady Novelists, 1856." },
      ],
    },
  },
];
