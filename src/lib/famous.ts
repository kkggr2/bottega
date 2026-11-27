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
  /** What's left out, by title: the record on the turntable, the film in the TV, the book open on the armchair. */
  now?: { song?: string; film?: string; book?: string };
  /** The same room in Spanish (for bilingual presses): the room's words, and each piece's line by its title. */
  es?: { name: string; tagline: string; source: string; draft?: string; lines: Record<string, string>; now?: FamousRoom["now"] };
};

/**
 * Each item: type, title, subtitle, cover, and optionally a line about it, a link (for example to read it free),
 * and anything else a piece can carry (a song's 30-second preview).
 */
function build(slug: string, items: [PieceType, string, string, string | null, string?, string?, Partial<Piece>?][]): Piece[] {
  return items.map(([type, title, subtitle, cover_url, body, link, extra], i) => ({
    id: `famous-${slug}-${i + 1}`, owner_id: `famous:${slug}`, type, title, subtitle, body: body ?? "", image_path: null, audio_path: null,
    link: link ?? null, cover_url, preview_url: null, clip_start: null, clip_end: null, position: i + 1, created_at: "",
    ...extra,
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
  // Their own covers, each book linking to its free edition, with the designers and editors Cita credits.
  // The lines are Bottega's placeholders for Cita to rewrite (in English and Spanish: Cita is a bilingual press).
  {
    slug: "citapress",
    person: "Cita Press", short: "Cita",
    name: "Cita Press",
    tagline: "Women's writing, free for everyone. Every book on this shelf can be read free at citapress.org.",
    source: "Books and covers from Cita Press's open-access library.",
    sourceUrl: "https://citapress.org/",
    theme: "rose", wallpaper: "stripe",
    draft: "A draft made for Cita Press to look at. It isn't listed anywhere on Bottega until they say yes, and every line can be changed.",
    now: { song: "The March of the Women", film: "The Yellow Wallpaper", book: "Dolores: Scenes from a Woman's Life" },
    pieces: build("citapress", [
      ["book", "The Yellow Wall-Paper", "Charlotte Perkins Gilman · 1892", cita("https://citapress.org/img/books/the-yellow-wall-paper/post.jpg"),
        "A woman told to rest, a room she can't leave, and a wallpaper she can't stop reading.\n\nCover: Laura Savina · Foreword: Catherine J. Golden",
        "https://citapress.org/the-yellow-wall-paper/"],
      ["book", "The Awakening", "Kate Chopin · 1899", cita("https://citapress.org/img/books/the-awakening/post.png"),
        "A summer on the Gulf Coast, and a woman who stops pretending.\n\nCover: Jiwon Park · Foreword: Heather Ostman",
        "https://citapress.org/the-awakening/"],
      ["book", "Ten Days in a Mad-House", "Nellie Bly · 1887", cita("https://citapress.org/img/books/ten-days-in-a-mad-house/post.png"),
        "The reporter who had herself committed to tell the truth about an asylum.\n\nCover and illustrations: Dajia Zhou · Foreword: Mikita Brottman",
        "https://citapress.org/ten-days-in-a-mad-house/"],
      ["book", "Incidents in the Life of a Slave Girl", "Harriet Jacobs · 1861", cita("https://citapress.org/img/books/incidents-in-the-life-of-a-slave-girl/post.jpg"),
        "Her own account of slavery and escape, written in her own name.\n\nCover: Thaïs Jacoponi · Foreword: Christy Hyman",
        "https://citapress.org/incidents-in-the-life-of-a-slave-girl/"],
      ["book", "Behind a Mask", "Louisa May Alcott · 1866", cita("https://citapress.org/img/books/behind-a-mask/post.png"),
        "The Little Women author, writing a thriller under another name.\n\nCover: Lauren Smedley",
        "https://citapress.org/behind-a-mask/"],
      ["book", "Mathilda", "Mary Shelley", cita("https://citapress.org/img/books/mathilda/post.jpg"),
        "Written in 1819–20 and kept from readers for more than a century.\n\nCover: Kathy Mueller · Foreword: Christina Standley",
        "https://citapress.org/mathilda/"],
      ["book", "Silly Novels by Silly Lady Novelists", "George Eliot · 1856", cita("https://citapress.org/img/books/silly-novels/post.png"),
        "A great novelist's sharp review of the fiction women were expected to write.\n\nCover: Jean Yang",
        "https://citapress.org/silly-novels/"],
      ["book", "Dolores: Scenes from a Woman's Life", "Soledad Acosta de Samper", cita("https://citapress.org/img/books/dolores-scenes-from-a-womans-life/post.jpeg"),
        "A Colombian classic, in a new English translation.\n\nTranslation and foreword: Sara Abadía Alvarado · Cover: Mariana Sanín A.",
        "https://citapress.org/dolores-scenes-from-a-womans-life/"],
      ["book", "A Luminous Halo", "Virginia Woolf", cita("https://citapress.org/img/books/a-luminous-halo-selected-writings-by-virginia-woolf/post.jpg"),
        "Selected writings by Woolf, gathered by Cita.\n\nGuest editor: JoAnn Borri · Cover: Mariana Matos",
        "https://citapress.org/a-luminous-halo-selected-writings-by-virginia-woolf/"],
      ["book", "Men, Women and Ghosts", "Amy Lowell · 1916", cita("https://citapress.org/img/books/men-women-and-ghosts/post.png"),
        "Stories told in poems. \"Patterns\", on the wall, is the first of them.\n\nCover: Annika Leppäaho",
        "https://citapress.org/men-women-and-ghosts/"],
      ["book", "Meditations on the Song of Songs", "Teresa of Ávila", cita("https://citapress.org/img/books/meditaciones/post.jpg"),
        "Teresa's meditations, which a confessor once ordered burned, and which survived.\n\nCover: Catalina Vásquez · Foreword: Ana María Carvajal",
        "https://citapress.org/meditaciones/"],
      ["poem", "Nada te turbe", "Teresa of Ávila", null,
        "Nada te turbe;\nnada te espante;\ntodo se pasa;\nDios no se muda,\nla paciencia\ntodo lo alcanza.\nQuien a Dios tiene,\nnada le falta.\nSolo Dios basta.",
        "https://citapress.org/meditaciones/"],
      ["poem", "Patterns", "Amy Lowell · 1916", null, "I walk down the garden paths,\nAnd all the daffodils\nAre blowing, and the bright blue squills.\nI walk down the patterned garden-paths\nIn my stiff, brocaded gown.\nWith my powdered hair and jewelled fan,\nI too am a rare\nPattern. As I wander down\nThe garden paths.\n\nMy dress is richly figured,\nAnd the train\nMakes a pink and silver stain\nOn the gravel, and the thrift\nOf the borders.\nJust a plate of current fashion,\nTripping by in high-heeled, ribboned shoes.\nNot a softness anywhere about me,\nOnly whalebone and brocade.\nAnd I sink on a seat in the shade\nOf a lime tree. For my passion\nWars against the stiff brocade.\nThe daffodils and squills\nFlutter in the breeze\nAs they please.\nAnd I weep;\nFor the lime-tree is in blossom\nAnd one small flower has dropped upon my bosom.\n\nAnd the plashing of waterdrops\nIn the marble fountain\nComes down the garden-paths.\nThe dripping never stops.\nUnderneath my stiffened gown\nIs the softness of a woman bathing in a marble basin,\nA basin in the midst of hedges grown\nSo thick, she cannot see her lover hiding,\nBut she guesses he is near,\nAnd the sliding of the water\nSeems the stroking of a dear\nHand upon her.\nWhat is Summer in a fine brocaded gown!\nI should like to see it lying in a heap upon the ground.\nAll the pink and silver crumpled up on the ground.\n\nI would be the pink and silver as I ran along the paths,\nAnd he would stumble after,\nBewildered by my laughter.\nI should see the sun flashing from his sword-hilt and the buckles on his shoes.\nI would choose\nTo lead him in a maze along the patterned paths,\nA bright and laughing maze for my heavy-booted lover,\nTill he caught me in the shade,\nAnd the buttons of his waistcoat bruised my body as he clasped me,\nAching, melting, unafraid.\nWith the shadows of the leaves and the sundrops,\nAnd the plopping of the waterdrops,\nAll about us in the open afternoon—\nI am very like to swoon\nWith the weight of this brocade,\nFor the sun sifts through the shade.\n\nUnderneath the fallen blossom\nIn my bosom,\nIs a letter I have hid.\nIt was brought to me this morning by a rider from the Duke.\n\"Madam, we regret to inform you that Lord Hartwell\nDied in action Thursday se'nnight.\"\nAs I read it in the white, morning sunlight,\nThe letters squirmed like snakes.\n\"Any answer, Madam,\" said my footman.\n\"No,\" I told him.\n\"See that the messenger takes some refreshment.\nNo, no answer.\"\nAnd I walked into the garden,\nUp and down the patterned paths,\nIn my stiff, correct brocade.\nThe blue and yellow flowers stood up proudly in the sun,\nEach one.\nI stood upright too,\nHeld rigid to the pattern\nBy the stiffness of my gown.\nUp and down I walked,\nUp and down.\n\nIn a month he would have been my husband.\nIn a month, here, underneath this lime,\nWe would have broke the pattern;\nHe for me, and I for him,\nHe as Colonel, I as Lady,\nOn this shady seat.\nHe had a whim\nThat sunlight carried blessing.\nAnd I answered, \"It shall be as you have said.\"\nNow he is dead.\n\nIn Summer and in Winter I shall walk\nUp and down\nThe patterned garden-paths\nIn my stiff, brocaded gown.\nThe squills and daffodils\nWill give place to pillared roses, and to asters, and to snow.\nI shall go\nUp and down,\nIn my gown.\nGorgeously arrayed,\nBoned and stayed.\nAnd the softness of my body will be guarded from embrace\nBy each button, hook, and lace.\nFor the man who should loose me is dead,\nFighting with the Duke in Flanders,\nIn a pattern called a war.\nChrist! What are patterns for?", "https://citapress.org/men-women-and-ghosts/read/"],
      ["song", "The March of the Women", "Ethel Smyth · 1911", "https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/be/ca/c7/becac7a6-2bfa-f11d-c72c-fed71aa27434/190295321994.jpg/600x600bb.jpg",
        "The suffragettes' anthem, written by a woman composer. Sung here by the Chorus of the Plymouth Music Series.",
        "https://music.apple.com/us/album/songs-of-sunrise-no-3-the-march-of-the-women/1484841192?i=1484841203",
        { preview_url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/b2/5a/6b/b25a6bdb-848c-30ca-c051-9d9be663e8a3/mzaf_14803217788646270337.plus.aac.p.m4a" }],
      ["song", "Gracias a la vida", "Violeta Parra · 1966", "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/0d/01/1e/0d011e26-7c33-a8a8-f45e-d0262beef095/mzm.ismvyxhg.jpg/600x600bb.jpg",
        "Written and first sung by Violeta Parra, the Chilean poet and songwriter. Mercedes Sosa made it an anthem.",
        "https://music.apple.com/us/album/gracias-a-la-vida/1054693764?i=1054693770",
        { preview_url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/84/5d/a9/845da9c0-525e-beb5-3fab-82d4443280ff/mzaf_12521979578160084187.plus.aac.p.m4a" }],
      ["scene", "The Yellow Wallpaper", "Kevin Pontuti · 2021", "https://i.ytimg.com/vi/zgws4d1_APY/hqdefault.jpg",
        "Charlotte Perkins Gilman's story on screen. The trailer.", "https://www.youtube.com/watch?v=zgws4d1_APY"],
      ["scene", "10 Days in a Madhouse", "Timothy Hines · 2015", "https://i.ytimg.com/vi/5P3Tz3tLX90/hqdefault.jpg",
        "Nellie Bly's ten days, filmed. The trailer.", "https://www.youtube.com/watch?v=5P3Tz3tLX90"],
      ["scene", "Grand Isle", "Mary Lambert · 1991", "https://i.ytimg.com/vi/aFrn5smk4uM/hqdefault.jpg",
        "Kate Chopin's The Awakening, on film. The trailer.", "https://www.youtube.com/watch?v=aFrn5smk4uM"],
    ]),
    es: {
      name: "Cita Press",
      tagline: "Escritura de mujeres, libre para todo el mundo. Cada libro de esta estantería se puede leer gratis en citapress.org.",
      source: "Libros y portadas de la biblioteca de acceso abierto de Cita Press.",
      draft: "Un borrador hecho para que Cita Press lo vea. No aparece en ningún lugar de Bottega hasta que digan que sí, y cada línea se puede cambiar.",
      lines: {
        "The Yellow Wall-Paper": "Una mujer a la que mandan descansar, un cuarto del que no puede salir y un papel tapiz que no deja de leer.",
        "The Awakening": "Un verano en la costa del Golfo y una mujer que deja de fingir.",
        "Ten Days in a Mad-House": "La periodista que se hizo internar para contar la verdad sobre un manicomio.",
        "Incidents in the Life of a Slave Girl": "Su propio relato de la esclavitud y la huida, escrito con su propio nombre.",
        "Behind a Mask": "La autora de Mujercitas, escribiendo un thriller con otro nombre.",
        "Mathilda": "Escrita en 1819–20 y apartada de los lectores durante más de un siglo.",
        "Silly Novels by Silly Lady Novelists": "La crítica afilada de una gran novelista a la ficción que se esperaba que escribieran las mujeres.",
        "Dolores: Scenes from a Woman's Life": "Un clásico colombiano de Soledad Acosta de Samper, en una nueva traducción al inglés.",
        "A Luminous Halo": "Escritos escogidos de Woolf, reunidos por Cita.",
        "Men, Women and Ghosts": "Historias contadas en poemas. «Patterns», en la pared, es la primera.",
        "Patterns": "",
        "Nada te turbe": "",
        "Meditations on the Song of Songs": "Las Meditaciones sobre los Cantares de Teresa, que un confesor mandó quemar y que sobrevivieron.",
        "Gracias a la vida": "Escrita y cantada primero por Violeta Parra, poeta y cantautora chilena. Mercedes Sosa la hizo himno.",
        "The March of the Women": "El himno de las sufragistas, compuesto por una mujer.",
        "The Yellow Wallpaper": "El cuento de Charlotte Perkins Gilman en la pantalla. El tráiler.",
        "10 Days in a Madhouse": "Los diez días de Nellie Bly, en película. El tráiler.",
        "Grand Isle": "El despertar de Kate Chopin, en película. El tráiler.",
      },
      // In Spanish, Violeta Parra is on the turntable and Teresa's book lies open on the armchair.
      now: { song: "Gracias a la vida", book: "Meditations on the Song of Songs" },
    },
  },
  // A draft for Alex Rollins Berg, who writes Underexposed (alexrollinsberg.substack.com), a weekly newsletter on
  // underseen films old and new. Every film here was a subject of one of his issues (Sep–Nov 2026), and each links to
  // that issue. The lines are left empty for his own words. Not listed until he agrees.
  {
    slug: "underexposed",
    person: "Alex Rollins Berg", short: "Alex",
    name: "Underexposed",
    tagline: "Hidden gems of cinema, old and new.",
    source: "Films picked in Alex Rollins Berg's newsletter, Underexposed. Each one links to his issue about it.",
    sourceUrl: "https://alexrollinsberg.substack.com/",
    theme: "oak", wallpaper: "stripe",
    draft: "A draft made for Alex Rollins Berg to look at, from the films in his newsletter. It isn't listed anywhere on Bottega until he says yes, and the empty lines are waiting for his own words.",
    pieces: build("underexposed", [
      ["poster", "The Devils", "Ken Russell · 1971", tmdb("y1k7eiOFc6fzm8XeTa1kNGx6JIs"), "", "https://alexrollinsberg.substack.com/p/the-most-controversial-film-of-all"],
      ["poster", "Yellow Sky", "William A. Wellman · 1948", tmdb("ahS9YKQSkckF5XSWkAJxpwLmuef"), "", "https://alexrollinsberg.substack.com/p/the-acid-western-must-ride-again"],
      ["poster", "The Last Detail", "Hal Ashby · 1973", tmdb("zQoNkO99qfaBjh5aoA0pKau1prp"), "", "https://alexrollinsberg.substack.com/p/war-after-war"],
      ["poster", "The Seashell and the Clergyman", "Germaine Dulac · 1928", tmdb("k5NKxt5XH6rEizJWlHsK0WFLOjg"), "", "https://alexrollinsberg.substack.com/p/who-erased-surrealist-cinemas-godmother"],
      ["poster", "The Shooting", "Monte Hellman · 1966", tmdb("oaySRq49jlCtoYjhoR7IhSga6Vm"), "", "https://alexrollinsberg.substack.com/p/the-acid-western-must-ride-again"],
      ["poster", "Late Fame", "Kent Jones · 2026", tmdb("bcyXE0p4XmZUlcxvTDbvdG9lgsN"), "", "https://alexrollinsberg.substack.com/p/the-past-lives-in-the-present"],
      ["poster", "Walker", "Alex Cox · 1987", tmdb("1C0oYAeNjIBLuj7CVWz3HTIUdeP"), "", "https://alexrollinsberg.substack.com/p/the-acid-western-must-ride-again"],
      ["poster", "The Messenger", "Oren Moverman · 2009", tmdb("p4fJyH7mMbasiFYwiw2nE7D6pMY"), "", "https://alexrollinsberg.substack.com/p/should-we-declare-cinema-a-religion"],
      ["poster", "The Phantom of the Open", "Craig Roberts · 2022", tmdb("6bcrhJQLoLNsYX4UGTOMQkCiACA"), "", "https://alexrollinsberg.substack.com/p/who-erased-surrealist-cinemas-godmother"],
      ["poster", "Mile End Kicks", "Chandler Levack · 2026", tmdb("qq3Q1tsxAxMqP38YTZKl8m5zmA4"), "", "https://alexrollinsberg.substack.com/p/wild-turkeys-2026-box-office-bombs"],
      ["poster", "Nirvanna the Band the Show the Movie", "Matt Johnson · 2026", tmdb("sm5TGX8WbnCd9Uo26cLyTxVwA1n"), "", "https://alexrollinsberg.substack.com/p/wild-turkeys-2026-box-office-bombs"],
      ["poster", "Power Ballad", "John Carney · 2026", tmdb("sGgX2K0SJqw90Ju8TONdhDVwlzT"), "", "https://alexrollinsberg.substack.com/p/wild-turkeys-2026-box-office-bombs"],
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
