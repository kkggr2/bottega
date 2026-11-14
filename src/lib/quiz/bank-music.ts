import type { Quiz } from "./bank-types";

/* Music quizzes. Right answer first (a: 0); the server shuffles the options for each person. */

export const MUSIC: Quiz[] = [
  {
    id: "nineties-singers", title: "The 90s singers quiz", blurb: "Flannel, frosted tips, power ballads.",
    qs: [
      { q: "Who sang for The Cranberries?", o: ["Dolores O'Riordan", "Sinéad O'Connor", "Shirley Manson", "Harriet Wheeler"], a: 0 },
      { q: "Who wrote \"Nothing Compares 2 U\", Sinéad O'Connor's 1990 hit?", o: ["Prince", "George Michael", "Babyface", "Kate Bush"], a: 0 },
      { q: "Which album holds \"Ironic\" and \"You Oughta Know\"?", o: ["Jagged Little Pill", "Under Rug Swept", "Tidal", "Little Earthquakes"], a: 0 },
      { q: "Whitney Houston's \"I Will Always Love You\" was written by…", o: ["Dolly Parton", "Diane Warren", "Carole King", "Linda Ronstadt"], a: 0 },
      { q: "What is Jeff Buckley's only finished studio album?", o: ["Grace", "Hallelujah", "Sketches", "Lover, You Should've Come Over"], a: 0 },
      { q: "Lauryn Hill's 1998 solo album is called The ____ of Lauryn Hill.", o: ["Miseducation", "Education", "Revolution", "Confession"], a: 0 },
      { q: "Which band was Björk in before going solo?", o: ["The Sugarcubes", "Sigur Rós", "Múm", "The Cardigans"], a: 0 },
    ],
  },
  {
    id: "beatles", title: "The Beatles quiz", blurb: "All you need is seven right answers.",
    qs: [
      { q: "What was the Beatles' first UK single?", o: ["Love Me Do", "Please Please Me", "She Loves You", "From Me to You"], a: 0 },
      { q: "Who was the drummer before Ringo Starr?", o: ["Pete Best", "Stuart Sutcliffe", "Jimmy Nicol", "Tony Sheridan"], a: 0, n: "Stuart Sutcliffe played bass." },
      { q: "Which was the last album the four recorded together?", o: ["Abbey Road", "Let It Be", "The White Album", "Yellow Submarine"], a: 0, n: "Let It Be came out later, but was mostly recorded earlier." },
      { q: "In which year was the rooftop concert?", o: ["1969", "1968", "1970", "1967"], a: 0 },
      { q: "Who wrote \"Something\"?", o: ["George Harrison", "John Lennon", "Paul McCartney", "Ringo Starr"], a: 0 },
      { q: "Who produced nearly all of their records?", o: ["George Martin", "Phil Spector", "Brian Epstein", "Geoff Emerick"], a: 0, n: "Epstein was their manager; Emerick an engineer." },
      { q: "In which year did Sgt. Pepper's Lonely Hearts Club Band come out?", o: ["1967", "1966", "1968", "1965"], a: 0 },
    ],
  },
  {
    id: "jazz", title: "The jazz quiz", blurb: "Blue notes and long solos.",
    qs: [
      { q: "Who led the band on Kind of Blue?", o: ["Miles Davis", "John Coltrane", "Bill Evans", "Cannonball Adderley"], a: 0, n: "Coltrane, Evans and Adderley all play on it." },
      { q: "\"Chameleon\" opens which Herbie Hancock album?", o: ["Head Hunters", "Maiden Voyage", "Thrust", "Future Shock"], a: 0 },
      { q: "Who recorded A Love Supreme?", o: ["John Coltrane", "Sonny Rollins", "Charles Mingus", "Pharoah Sanders"], a: 0 },
      { q: "Who composed \"Take Five\"?", o: ["Paul Desmond", "Dave Brubeck", "Joe Morello", "Gerry Mulligan"], a: 0, n: "Desmond played alto sax in the Dave Brubeck Quartet." },
      { q: "Which singer was called \"the First Lady of Song\"?", o: ["Ella Fitzgerald", "Billie Holiday", "Sarah Vaughan", "Nina Simone"], a: 0 },
      { q: "In which year did Billie Holiday first record \"Strange Fruit\"?", o: ["1939", "1945", "1932", "1952"], a: 0 },
      { q: "Which instrument did Thelonious Monk play?", o: ["Piano", "Trumpet", "Saxophone", "Double bass"], a: 0 },
    ],
  },
  {
    id: "seventies-rock", title: "The 70s rock quiz", blurb: "Gatefold sleeves and twenty-minute songs.",
    qs: [
      { q: "In which year did Fleetwood Mac release Rumours?", o: ["1977", "1975", "1979", "1973"], a: 0 },
      { q: "Which pair joined Fleetwood Mac before Rumours?", o: ["Lindsey Buckingham and Stevie Nicks", "John and Christine McVie", "Peter Green and Jeremy Spencer", "Bob Welch and Danny Kirwan"], a: 0 },
      { q: "\"Bohemian Rhapsody\" first appeared on which Queen album?", o: ["A Night at the Opera", "News of the World", "Sheer Heart Attack", "A Day at the Races"], a: 0 },
      { q: "What was David Bowie's alien rock star alter ego in 1972?", o: ["Ziggy Stardust", "Aladdin Sane", "The Thin White Duke", "Major Tom"], a: 0 },
      { q: "In which year did Pink Floyd release The Dark Side of the Moon?", o: ["1973", "1971", "1975", "1979"], a: 0 },
      { q: "\"Stairway to Heaven\" is on Led Zeppelin's…", o: ["Fourth album", "Second album", "Houses of the Holy", "Physical Graffiti"], a: 0, n: "Officially untitled, usually called Led Zeppelin IV." },
      { q: "Which band made Hotel California?", o: ["The Eagles", "The Doobie Brothers", "Steely Dan", "Lynyrd Skynyrd"], a: 0 },
    ],
  },
  {
    id: "nineties-hiphop", title: "The 90s hip-hop quiz", blurb: "East coast, west coast, golden age.",
    qs: [
      { q: "What was the Notorious B.I.G.'s debut album?", o: ["Ready to Die", "Life After Death", "Illmatic", "Reasonable Doubt"], a: 0 },
      { q: "Wu-Tang Clan's debut is Enter the Wu-Tang (…)", o: ["36 Chambers", "Shaolin Style", "Forever", "Protect Ya Neck"], a: 0 },
      { q: "Who made Illmatic?", o: ["Nas", "Jay-Z", "Rakim", "Mobb Deep"], a: 0 },
      { q: "Who had the hit \"Gin and Juice\"?", o: ["Snoop Dogg", "Dr. Dre", "Warren G", "Ice Cube"], a: 0 },
      { q: "Which Fugees album has \"Killing Me Softly\"?", o: ["The Score", "Blunted on Reality", "The Miseducation", "The Carnival"], a: 0 },
      { q: "On which label did Tupac release All Eyez on Me?", o: ["Death Row", "Bad Boy", "Def Jam", "Ruthless"], a: 0 },
      { q: "What was Missy Elliott's debut album?", o: ["Supa Dupa Fly", "Da Real World", "Under Construction", "Miss E… So Addictive"], a: 0 },
    ],
  },
  {
    id: "bob-dylan", title: "The Bob Dylan quiz", blurb: "The answer is blowin' in the wind.",
    qs: [
      { q: "What was Bob Dylan's birth name?", o: ["Robert Zimmerman", "Robert Allen", "Robert Dillon", "Robert Zimmer"], a: 0 },
      { q: "At which festival did Dylan famously go electric in 1965?", o: ["Newport Folk Festival", "Monterey Pop", "Woodstock", "Isle of Wight"], a: 0 },
      { q: "In which year did Dylan win the Nobel Prize in Literature?", o: ["2016", "2012", "2019", "2008"], a: 0 },
      { q: "\"Like a Rolling Stone\" opens which album?", o: ["Highway 61 Revisited", "Blonde on Blonde", "Bringing It All Back Home", "Blood on the Tracks"], a: 0 },
      { q: "In which year did Blood on the Tracks come out?", o: ["1975", "1970", "1979", "1966"], a: 0 },
      { q: "In which year did Dylan's motorcycle accident take him off the road?", o: ["1966", "1964", "1969", "1971"], a: 0 },
      { q: "Which folk singer brought young Dylan on stage and was briefly his partner?", o: ["Joan Baez", "Joni Mitchell", "Judy Collins", "Odetta"], a: 0 },
    ],
  },
];
