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
  /**
   * A draft made for someone to look at before they agree: reachable by its link only, left out of every
   * list and of search engines, with this note at the top.
   */
  draft?: string;
};

/** Each item: type, title, subtitle, cover, and optionally a line about it and a link (for example to read it free). */
function build(slug: string, items: [PieceType, string, string, string | null, string?, string?][]): Piece[] {
  return items.map(([type, title, subtitle, cover_url, body, link], i) => ({
    id: `famous-${slug}-${i + 1}`, owner_id: `famous:${slug}`, type, title, subtitle, body: body ?? "", image_path: null, audio_path: null,
    link: link ?? null, cover_url, preview_url: null, clip_start: null, clip_end: null, position: i + 1, created_at: "",
  }));
}

const tmdb = (path: string) => `https://image.tmdb.org/t/p/w500/${path}.jpg`;
const ol = (id: number) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
/** Cita Press's own covers, from citapress.org (each credits its cover artist). */
const cita = (url: string) => url;

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
  {
    slug: "tarantino",
    person: "Quentin Tarantino", short: "Tarantino",
    name: "Tarantino's ballot",
    tagline: "His twelve for the greatest films of all time.",
    source: "His ballot in the 2012 Sight and Sound directors' poll.",
    sourceUrl: "https://www.bfi.org.uk/sight-and-sound/greatest-films-all-time",
    theme: "midnight", wallpaper: "stripe",
    pieces: build("tarantino", [
      ["poster", "Apocalypse Now", "Francis Ford Coppola · 1979", tmdb("gQB8Y5RCMkv2zwzFHbUJX3kAhvA")],
      ["poster", "The Bad News Bears", "Michael Ritchie · 1976", tmdb("kJNXMni0ObOXLth6v9xpUhWbtrp")],
      ["poster", "Carrie", "Brian De Palma · 1976", tmdb("8tT1rqlsTguyfUBMrbHR9cv1rxM")],
      ["poster", "Dazed and Confused", "Richard Linklater · 1993", tmdb("msG9awbLhVZwv1Eh9Ge7SofMexW")],
      ["poster", "The Great Escape", "John Sturges · 1963", tmdb("gBH4H8UMFxl139HaLz6lRuvsel8")],
      ["poster", "His Girl Friday", "Howard Hawks · 1940", tmdb("lu86Y9zTPH3neCiUzLzHCEFHf7f")],
      ["poster", "Jaws", "Steven Spielberg · 1975", tmdb("lxM6kqilAdpdhqUl2biYp5frUxE")],
      ["poster", "Pretty Maids All in a Row", "Roger Vadim · 1971", tmdb("v9fOCFolNCB5RQ4grachHoYK7cb")],
      ["poster", "Rolling Thunder", "John Flynn · 1977", tmdb("9iZjVn6Q5FJa92SQLcFMrskpES9")],
      ["poster", "Sorcerer", "William Friedkin · 1977", tmdb("2b7oexm173SF1FSEq0DdgxZZNRH")],
      ["poster", "Taxi Driver", "Martin Scorsese · 1976", tmdb("ekstpH614fwDX8DUln1a2Opz0N8")],
      ["poster", "The Good, the Bad and the Ugly", "Sergio Leone · 1966", tmdb("bX2xnavhMYjWDoZp1VM6VnU1xwe")],
    ]),
  },
  {
    slug: "scorsese",
    person: "Martin Scorsese", short: "Scorsese",
    name: "Scorsese's ballot",
    tagline: "The twelve films he named as the greatest.",
    source: "His ballot in the 2012 Sight and Sound directors' poll.",
    sourceUrl: "https://www.bfi.org.uk/sight-and-sound/greatest-films-all-time",
    theme: "rose", wallpaper: "stripe",
    pieces: build("scorsese", [
      ["poster", "2001: A Space Odyssey", "Stanley Kubrick · 1968", tmdb("ve72VxNqjGM69Uky4WTo2bK6rfq")],
      ["poster", "8½", "Federico Fellini · 1963", tmdb("23VIf7zNxAgaXwIlvzd3IvOd9sY")],
      ["poster", "Ashes and Diamonds", "Andrzej Wajda · 1958", tmdb("nE8aqRvVnRQEqskiarnFhdJdk8g")],
      ["poster", "Citizen Kane", "Orson Welles · 1941", tmdb("sav0jxhqiH0bPr2vZFU0Kjt2nZL")],
      ["poster", "The Leopard", "Luchino Visconti · 1963", tmdb("riSUxwoK3xjkOgy6YJSvPhi7cO6")],
      ["poster", "Paisan", "Roberto Rossellini · 1946", tmdb("r5IGAFASCXmp8m51vUbER3WwVcB")],
      ["poster", "The Red Shoes", "Michael Powell & Emeric Pressburger · 1948", tmdb("vPvpBWFWDvEXuQBkoYgA6A89GVp")],
      ["poster", "The River", "Jean Renoir · 1951", null],
      ["poster", "Salvatore Giuliano", "Francesco Rosi · 1962", tmdb("uaFTCD0y2MEccTFyHOHj6IrwyZ")],
      ["poster", "The Searchers", "John Ford · 1956", tmdb("jLBmgW0epNzJ1N9uzaVCjbyT94v")],
      ["poster", "Ugetsu", "Kenji Mizoguchi · 1953", tmdb("r8RiuKTIYIJBjczBVsfeP5C00CJ")],
      ["poster", "Vertigo", "Alfred Hitchcock · 1958", tmdb("15uOEfqBNTVtDUT7hGBVCka0rZz")],
    ]),
  },
  {
    slug: "ebert",
    person: "Roger Ebert", short: "Ebert",
    name: "Ebert's ten",
    tagline: "The critic's last list of the greatest films.",
    source: "His ballot in the 2012 Sight and Sound critics' poll.",
    sourceUrl: "https://www.bfi.org.uk/sight-and-sound/greatest-films-all-time",
    theme: "seaglass", wallpaper: "dots",
    pieces: build("ebert", [
      ["poster", "Aguirre, the Wrath of God", "Werner Herzog · 1972", tmdb("zU1FLiGJw3m3iFrakwA0SzFvIPV")],
      ["poster", "Apocalypse Now", "Francis Ford Coppola · 1979", tmdb("gQB8Y5RCMkv2zwzFHbUJX3kAhvA")],
      ["poster", "Citizen Kane", "Orson Welles · 1941", tmdb("sav0jxhqiH0bPr2vZFU0Kjt2nZL")],
      ["poster", "La Dolce Vita", "Federico Fellini · 1960", tmdb("dZ2v0DAX4aCZartCzZdg4ZinSW2")],
      ["poster", "The General", "Buster Keaton & Clyde Bruckman · 1926", tmdb("4NmV1Wei4LxT2lpjViCAScgCZLq")],
      ["poster", "Raging Bull", "Martin Scorsese · 1980", tmdb("1WV7WlTS8LI1L5NkCgjWT9GSW3O")],
      ["poster", "2001: A Space Odyssey", "Stanley Kubrick · 1968", tmdb("ve72VxNqjGM69Uky4WTo2bK6rfq")],
      ["poster", "Tokyo Story", "Yasujirō Ozu · 1953", tmdb("g2YbTYKpY7N2yDSk7BfXZ18I5QV")],
      ["poster", "The Tree of Life", "Terrence Malick · 2011", tmdb("l8cwuB5WJSoj4uMAsnzuHBOMaSJ")],
      ["poster", "Vertigo", "Alfred Hitchcock · 1958", tmdb("15uOEfqBNTVtDUT7hGBVCka0rZz")],
    ]),
  },
  // A draft for Cita Press (citapress.org), an open library and press for women's writing. Not listed until they agree.
  // Every book links to its free edition on citapress.org. The lines are Bottega's placeholders for Cita to rewrite.
  {
    slug: "citapress",
    person: "Cita Press", short: "Cita",
    name: "Cita Press",
    tagline: "Women's writing, free for everyone. Every book on this shelf can be read free at citapress.org.",
    source: "Books and covers from Cita Press's open-access library.",
    sourceUrl: "https://citapress.org/",
    theme: "rose", wallpaper: "stripe",
    draft: "A draft made for Cita Press to look at. It isn't listed anywhere on Bottega until they say yes, and every line can be changed.",
    pieces: build("citapress", [
      ["book", "The Yellow Wall-Paper", "Charlotte Perkins Gilman · 1892", cita("https://citapress.org/img/books/the-yellow-wall-paper/post.jpg"),
        "A woman told to rest, a room she can't leave, and a wallpaper she can't stop reading.", "https://citapress.org/the-yellow-wall-paper/"],
      ["book", "The Awakening", "Kate Chopin · 1899", cita("https://citapress.org/img/books/the-awakening/post.png"),
        "A summer on the Gulf Coast, and a woman who stops pretending.", "https://citapress.org/the-awakening/"],
      ["book", "Ten Days in a Mad-House", "Nellie Bly · 1887", cita("https://citapress.org/img/books/ten-days-in-a-mad-house/post.png"),
        "The reporter who had herself committed to tell the truth about an asylum.", "https://citapress.org/ten-days-in-a-mad-house/"],
      ["book", "Incidents in the Life of a Slave Girl", "Harriet Jacobs · 1861", cita("https://citapress.org/img/books/incidents-in-the-life-of-a-slave-girl/post.jpg"),
        "Her own account of slavery and escape, written in her own name.", "https://citapress.org/incidents-in-the-life-of-a-slave-girl/"],
      ["book", "Behind a Mask", "Louisa May Alcott · 1866", cita("https://citapress.org/img/books/behind-a-mask/post.png"),
        "The Little Women author, writing a thriller under another name.", "https://citapress.org/behind-a-mask/"],
      ["book", "Mathilda", "Mary Shelley", cita("https://citapress.org/img/books/mathilda/post.jpg"),
        "Written in 1819–20 and kept from readers for more than a century.", "https://citapress.org/mathilda/"],
      ["book", "Silly Novels by Silly Lady Novelists", "George Eliot · 1856", cita("https://citapress.org/img/books/silly-novels/post.png"),
        "A great novelist's sharp review of the fiction women were expected to write.", "https://citapress.org/silly-novels/"],
      ["book", "Dolores: Scenes from a Woman's Life", "Soledad Acosta de Samper", cita("https://citapress.org/img/books/dolores-scenes-from-a-womans-life/post.jpeg"),
        "A Colombian classic, in a new English translation.", "https://citapress.org/dolores-scenes-from-a-womans-life/"],
      ["book", "A Luminous Halo", "Virginia Woolf", cita("https://citapress.org/img/books/a-luminous-halo-selected-writings-by-virginia-woolf/post.jpg"),
        "Selected writings by Woolf, gathered by Cita.", "https://citapress.org/a-luminous-halo-selected-writings-by-virginia-woolf/"],
    ]),
  },
];

/** The famous rooms shown in lists: everything except drafts. */
export const LISTED: FamousRoom[] = FAMOUS.filter((f) => !f.draft);

export function famousRoom(slug: string): FamousRoom | null {
  return FAMOUS.find((f) => f.slug === slug) ?? null;
}

export function asRoom(f: FamousRoom): Room {
  return { owner_id: `famous:${f.slug}`, name: f.name, tagline: f.tagline, theme: f.theme, wallpaper: f.wallpaper, visibility: "public" };
}
