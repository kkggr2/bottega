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
];
