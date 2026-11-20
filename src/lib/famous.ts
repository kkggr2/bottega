import type { Piece, PieceType, Room, ThemeKey, Wallpaper } from "./types";

/*
 * Famous rooms: rooms put together by Bottega from lists that well-known people published themselves.
 * Only documented lists, each with its source. Nobody's words are made up: the "why" lines stay empty,
 * and every room says plainly that Bottega arranged it. Anyone can visit; signed in, you get a Taste Match.
 */

export type FamousRoom = {
  slug: string;
  /** Shown as is, never with "@": "Andrei Tarkovsky". */
  person: string;
  /** Short name for the Taste Match picture: "Tarkovsky". */
  short: string;
  name: string;
  tagline: string;
  /** Where the list comes from, in one line. */
  source: string;
  sourceUrl: string;
  theme: ThemeKey;
  wallpaper: Wallpaper;
  pieces: Piece[];
};

function build(slug: string, items: [PieceType, string, string, string | null][]): Piece[] {
  return items.map(([type, title, subtitle, cover_url], i) => ({
    id: `famous-${slug}-${i + 1}`, owner_id: `famous:${slug}`, type, title, subtitle, body: "", image_path: null, audio_path: null,
    link: null, cover_url, preview_url: null, clip_start: null, clip_end: null, position: i + 1, created_at: "",
  }));
}

const tmdb = (path: string) => `https://image.tmdb.org/t/p/w500/${path}.jpg`;
const ol = (id: number) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;

export const FAMOUS: FamousRoom[] = [
  {
    slug: "tarkovsky",
    person: "Andrei Tarkovsky", short: "Tarkovsky",
    name: "Tarkovsky's ten",
    tagline: "The ten films he named as his favourites.",
    source: "Listed by Tarkovsky for Leonid Kozlov in 1972.",
    sourceUrl: "https://en.wikipedia.org/wiki/Andrei_Tarkovsky",
    theme: "moss", wallpaper: "stripe",
    pieces: build("tarkovsky", [
      ["poster", "Diary of a Country Priest", "Robert Bresson · 1951", tmdb("mft7ZJqHxUyFaLL3ZYXX1MN2Gro")],
      ["poster", "Winter Light", "Ingmar Bergman · 1963", tmdb("hyHVYbvrDQottG45HBd3Z02oCDt")],
      ["poster", "Nazarín", "Luis Buñuel · 1959", tmdb("7W2hnPt4glMnaxJU33wAjKyf7lc")],
      ["poster", "Wild Strawberries", "Ingmar Bergman · 1957", tmdb("iyTD2QnySNMPUPE3IedZQipSWfz")],
      ["poster", "City Lights", "Charlie Chaplin · 1931", tmdb("bXNvzjULc9jrOVhGfjcc64uKZmZ")],
      ["poster", "Ugetsu", "Kenji Mizoguchi · 1953", tmdb("r8RiuKTIYIJBjczBVsfeP5C00CJ")],
      ["poster", "Seven Samurai", "Akira Kurosawa · 1954", tmdb("lOMGc8bnSwQhS4XyE1S99uH8NXf")],
      ["poster", "Persona", "Ingmar Bergman · 1966", tmdb("cl0HEZT8UfzLqaMrYTvGNHOfPYj")],
      ["poster", "Mouchette", "Robert Bresson · 1967", tmdb("cITZsSQ7VG122xQ0xAN3NHZF0OH")],
      ["poster", "Woman in the Dunes", "Hiroshi Teshigahara · 1964", tmdb("xiBr3bIT2xpbuIKo5bLK7ebP4O1")],
    ]),
  },
  {
    slug: "kubrick",
    person: "Stanley Kubrick", short: "Kubrick",
    name: "Kubrick's top ten",
    tagline: "The films he put at the top, before he made 2001.",
    source: "Kubrick's list for Cinema magazine, 1963.",
    sourceUrl: "https://en.wikipedia.org/wiki/Stanley_Kubrick",
    theme: "midnight", wallpaper: "grid",
    pieces: build("kubrick", [
      ["poster", "I Vitelloni", "Federico Fellini · 1953", tmdb("boqcM6bhQICnNue4pkgmauj9JN3")],
      ["poster", "Wild Strawberries", "Ingmar Bergman · 1957", tmdb("iyTD2QnySNMPUPE3IedZQipSWfz")],
      ["poster", "Citizen Kane", "Orson Welles · 1941", tmdb("sav0jxhqiH0bPr2vZFU0Kjt2nZL")],
      ["poster", "The Treasure of the Sierra Madre", "John Huston · 1948", tmdb("pWcst7zVbi8Z8W6GFrdNE7HHRxL")],
      ["poster", "City Lights", "Charlie Chaplin · 1931", tmdb("bXNvzjULc9jrOVhGfjcc64uKZmZ")],
      ["poster", "Henry V", "Laurence Olivier · 1944", tmdb("eAisr20DvaKJeHvjDN0oHSx0l7u")],
      ["poster", "La Notte", "Michelangelo Antonioni · 1961", tmdb("xkd7wPJSIC76scBRHCFZ85uOH5d")],
      ["poster", "The Bank Dick", "Edward F. Cline · 1940", tmdb("3XrqHTrJpTaUeyqXqb4fVacYWpf")],
      ["poster", "Roxie Hart", "William A. Wellman · 1942", tmdb("hBCSkYj3xMsWcbEzG2kD3dhF3sM")],
      ["poster", "Hell's Angels", "Howard Hughes · 1930", tmdb("vt6zF55B9WLzYENs6cuXy8J5o1X")],
    ]),
  },
  {
    slug: "bowie",
    person: "David Bowie", short: "Bowie",
    name: "Bowie's bookshelf",
    tagline: "Seventeen from the hundred books he picked.",
    source: "From Bowie's list of 100 books, shared in 2013 for the David Bowie Is exhibition.",
    sourceUrl: "https://en.wikipedia.org/wiki/David_Bowie_Is",
    theme: "rose", wallpaper: "damask",
    pieces: build("bowie", [
      ["book", "The Master and Margarita", "Mikhail Bulgakov · 1967", ol(12947486)],
      ["book", "The Stranger", "Albert Camus · 1942", ol(13151269)],
      ["book", "A Clockwork Orange", "Anthony Burgess · 1962", ol(14430663)],
      ["book", "The Great Gatsby", "F. Scott Fitzgerald · 1925", ol(10590366)],
      ["book", "Nineteen Eighty-Four", "George Orwell · 1949", ol(9267242)],
      ["book", "Madame Bovary", "Gustave Flaubert · 1856", ol(12993424)],
      ["book", "On the Road", "Jack Kerouac · 1957", ol(34655)],
      ["book", "The Iliad", "Homer", ol(7083790)],
      ["book", "White Noise", "Don DeLillo · 1985", ol(94015)],
      ["book", "Money", "Martin Amis · 1984", ol(94212)],
      ["book", "Wonder Boys", "Michael Chabon · 1995", ol(8347389)],
      ["book", "Hawksmoor", "Peter Ackroyd · 1985", ol(96542)],
      ["book", "Berlin Alexanderplatz", "Alfred Döblin · 1929", ol(577140)],
      ["book", "The Leopard", "Giuseppe Tomasi di Lampedusa · 1958", ol(1049045)],
      ["book", "In Cold Blood", "Truman Capote · 1966", ol(228066)],
      ["book", "The Prime of Miss Jean Brodie", "Muriel Spark · 1961", ol(40054)],
      ["book", "Lady Chatterley's Lover", "D. H. Lawrence · 1928", ol(12983362)],
    ]),
  },
];

export function famousRoom(slug: string): FamousRoom | null {
  return FAMOUS.find((f) => f.slug === slug) ?? null;
}

export function asRoom(f: FamousRoom): Room {
  return { owner_id: `famous:${f.slug}`, name: f.name, tagline: f.tagline, theme: f.theme, wallpaper: f.wallpaper, visibility: "public" };
}
