/** One question: four options, the right one's index, and a short fact shown after answering. */
export type Q = { q: string; o: [string, string, string, string]; a: 0 | 1 | 2 | 3; n?: string };
export type Quiz = { id: string; title: string; blurb: string; qs: Q[] };
