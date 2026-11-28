import { Abril_Fatface, Bebas_Neue, Cinzel, Playfair_Display, Righteous, Special_Elite } from "next/font/google";

/*
 * Title typefaces for DVD covers, the way film titles look in their era: roman capitals for old classics,
 * bold retro letters for the 70s and 80s, tall condensed capitals or a typewriter for recent films.
 * Not preloaded: a typeface only downloads when a DVD in the room uses it.
 */

const cinzel = Cinzel({ variable: "--ff-cinzel", subsets: ["latin"], preload: false });
const playfair = Playfair_Display({ variable: "--ff-playfair", subsets: ["latin"], style: ["italic"], preload: false });
const abril = Abril_Fatface({ variable: "--ff-abril", subsets: ["latin"], weight: "400", preload: false });
const righteous = Righteous({ variable: "--ff-righteous", subsets: ["latin"], weight: "400", preload: false });
const bebas = Bebas_Neue({ variable: "--ff-bebas", subsets: ["latin"], weight: "400", preload: false });
const elite = Special_Elite({ variable: "--ff-elite", subsets: ["latin"], weight: "400", preload: false });

/** Put on <html> so the covers can use the typefaces by name. */
export const dvdFontVariables = [cinzel, playfair, abril, righteous, bebas, elite].map((f) => f.variable).join(" ");

export type DvdLook = "cinzel" | "playfair" | "abril" | "righteous" | "bebas" | "elite";

/** The typeface for a film's cover, from its year (in "Director · 1972") and a steady pick among that era's looks. */
export function dvdLook(subtitle: string, seed: number): DvdLook {
  const year = Number(subtitle.match(/\b(18|19|20)\d{2}\b/)?.[0] ?? 0);
  const looks: DvdLook[] = !year ? ["playfair", "bebas", "elite", "righteous", "cinzel", "abril"]
    : year < 1960 ? ["cinzel", "playfair"]
    : year < 1980 ? ["abril", "righteous", "playfair"]
    : year < 2000 ? ["righteous", "bebas", "abril"]
    : ["bebas", "elite", "playfair"];
  return looks[seed % looks.length];
}

/** How wide each typeface runs, as a share of its size per letter (condensed Bebas is narrow, Cinzel's capitals wide). */
const WIDTH: Record<DvdLook, number> = { cinzel: 0.74, playfair: 0.56, abril: 0.62, righteous: 0.6, bebas: 0.42, elite: 0.6 };

/**
 * The title size on a spine, running down it: one line when it fits at a readable size, otherwise two lines side by
 * side (still breaking only between words). A spine has about 100px of length for the title.
 */
export function dvdSpineTitle(title: string, look: DvdLook): { size: number; lines: 1 | 2 } {
  const run = WIDTH[look] * Math.max(1, title.length);
  const one = 100 / run;
  if (one >= 10) return { size: Math.round(Math.min(15, one) * 2) / 2, lines: 1 };
  return { size: Math.round(Math.max(8.5, Math.min(11.5, 200 / run)) * 2) / 2, lines: 2 };
}
