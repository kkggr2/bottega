/*
 * One question: four options, the right one's index, and a short fact shown after answering.
 * Besides plain facts there are picture and play questions:
 * - still:   "Which film is this?" with a frame from the film (media key)
 * - cover:   a close-up of an album cover (media key, crop = [x%, y%, zoom]) that leaves its title out
 * - palette: the five main colours of a film frame or album cover (media key)
 * - quote:   a line, and who said it or where it's from
 * - emoji:   the story or title told in emoji
 */
export type Kind = "fact" | "still" | "cover" | "palette" | "quote" | "emoji";
export type Q = {
  q: string;
  o: [string, string, string, string];
  a: 0 | 1 | 2 | 3;
  n?: string;
  kind?: Kind;
  media?: string;
  crop?: [number, number, number];
  quote?: string;
  emoji?: string;
};
export type Quiz = { id: string; title: string; blurb: string; qs: Q[] };
