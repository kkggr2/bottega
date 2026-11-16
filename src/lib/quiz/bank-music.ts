import type { Quiz } from "./bank-types";

/*
 * Music quizzes: three facts, two album-cover close-ups (cropped so the title doesn't show),
 * one cover palette and one song title in emoji. No lyrics.
 * Right answer first (a: 0); the server shuffles the options for each person.
 * crop = [x%, y%, zoom] — where to look on the cover and how close.
 */

export const MUSIC: Quiz[] = [
  {
    id: "nineties-singers", title: "The 90s singers quiz", blurb: "Flannel, frosted tips, power ballads.",
    qs: [
      { kind: "cover", media: "tidal", crop: [50, 30, 1.9], q: "Whose album cover is this?", o: ["Fiona Apple, Tidal", "Alanis Morissette, Jagged Little Pill", "Tori Amos, Little Earthquakes", "Sheryl Crow, Tuesday Night Music Club"], a: 0 },
      { q: "Who wrote \"Nothing Compares 2 U\", Sinéad O'Connor's 1990 hit?", o: ["Prince", "George Michael", "Babyface", "Kate Bush"], a: 0 },
      { kind: "emoji", emoji: "🧟", q: "Which 90s hit is this?", o: ["Zombie", "Creep", "Bitter Sweet Symphony", "Torn"], a: 0, n: "The Cranberries, 1994." },
      { kind: "palette", media: "miseducation", q: "Whose cover colours are these?", o: ["The Miseducation of Lauryn Hill", "Baduizm", "CrazySexyCool", "Brown Sugar"], a: 0 },
      { q: "Whitney Houston's \"I Will Always Love You\" was written by…", o: ["Dolly Parton", "Diane Warren", "Carole King", "Linda Ronstadt"], a: 0 },
      { kind: "cover", media: "debut", crop: [50, 55, 1.7], q: "And this cover?", o: ["Björk, Debut", "Björk, Homogenic", "PJ Harvey, Rid of Me", "Portishead, Dummy"], a: 0 },
      { q: "Which band was Björk in before going solo?", o: ["The Sugarcubes", "Sigur Rós", "Múm", "The Cardigans"], a: 0 },
    ],
  },
  {
    id: "beatles", title: "The Beatles quiz", blurb: "All you need is seven right answers.",
    qs: [
      { kind: "cover", media: "sgt-pepper", crop: [50, 8, 2.2], q: "Which Beatles cover is this?", o: ["Sgt. Pepper's Lonely Hearts Club Band", "Magical Mystery Tour", "Yellow Submarine", "Let It Be"], a: 0 },
      { q: "Who was the drummer before Ringo Starr?", o: ["Pete Best", "Stuart Sutcliffe", "Jimmy Nicol", "Tony Sheridan"], a: 0 },
      { kind: "emoji", emoji: "🍓🌳♾️", q: "Which Beatles song is this?", o: ["Strawberry Fields Forever", "Penny Lane", "Across the Universe", "Here Comes the Sun"], a: 0 },
      { kind: "palette", media: "abbey-road", q: "Whose cover colours are these?", o: ["Abbey Road", "Let It Be", "Help!", "Rubber Soul"], a: 0 },
      { q: "Who wrote \"Something\"?", o: ["George Harrison", "John Lennon", "Paul McCartney", "Ringo Starr"], a: 0 },
      { kind: "cover", media: "revolver", crop: [42, 40, 2.2], q: "And this one?", o: ["Revolver", "Rubber Soul", "Beatles for Sale", "With the Beatles"], a: 0, n: "Drawn by their Hamburg friend Klaus Voormann." },
      { q: "Who produced nearly all of their records?", o: ["George Martin", "Phil Spector", "Brian Epstein", "Geoff Emerick"], a: 0 },
    ],
  },
  {
    id: "jazz", title: "The jazz quiz", blurb: "Blue notes and long solos.",
    qs: [
      { kind: "cover", media: "kind-of-blue", crop: [38, 68, 2], q: "Which album cover is this?", o: ["Miles Davis, Kind of Blue", "Miles Davis, Sketches of Spain", "Chet Baker, Chet", "Lee Morgan, The Sidewinder"], a: 0 },
      { q: "Who composed \"Take Five\"?", o: ["Paul Desmond", "Dave Brubeck", "Joe Morello", "Gerry Mulligan"], a: 0, n: "Desmond played alto sax in the Dave Brubeck Quartet." },
      { kind: "emoji", emoji: "🍂🍂", q: "Which jazz standard is this?", o: ["Autumn Leaves", "Summertime", "Round Midnight", "Blue in Green"], a: 0 },
      { kind: "palette", media: "blue-train", q: "Whose cover colours are these?", o: ["John Coltrane, Blue Train", "John Coltrane, Giant Steps", "Sonny Rollins, Saxophone Colossus", "Dexter Gordon, Go"], a: 0 },
      { q: "Which singer was called \"the First Lady of Song\"?", o: ["Ella Fitzgerald", "Billie Holiday", "Sarah Vaughan", "Nina Simone"], a: 0 },
      { kind: "cover", media: "head-hunters", crop: [50, 62, 2.2], q: "And this cover?", o: ["Herbie Hancock, Head Hunters", "Herbie Hancock, Thrust", "Weather Report, Heavy Weather", "Donald Byrd, Places and Spaces"], a: 0 },
      { q: "Which instrument did Thelonious Monk play?", o: ["Piano", "Trumpet", "Saxophone", "Double bass"], a: 0 },
    ],
  },
  {
    id: "seventies-rock", title: "The 70s rock quiz", blurb: "Gatefold sleeves and twenty-minute songs.",
    qs: [
      { kind: "cover", media: "wish-you", crop: [48, 58, 2.3], q: "Which album cover is this?", o: ["Pink Floyd, Wish You Were Here", "Pink Floyd, Animals", "Led Zeppelin, Presence", "Genesis, Selling England by the Pound"], a: 0, n: "One of the two men really was set on fire." },
      { q: "Which pair joined Fleetwood Mac before Rumours?", o: ["Lindsey Buckingham and Stevie Nicks", "John and Christine McVie", "Peter Green and Jeremy Spencer", "Bob Welch and Danny Kirwan"], a: 0 },
      { kind: "emoji", emoji: "🏨🌴", q: "Which 70s song is this?", o: ["Hotel California", "Heartbreak Hotel", "California Dreamin'", "Take It Easy"], a: 0 },
      { kind: "palette", media: "ziggy", q: "Whose cover colours are these?", o: ["The Rise and Fall of Ziggy Stardust", "Aladdin Sane", "Hunky Dory", "Diamond Dogs"], a: 0, n: "Bowie under a streetlamp on Heddon Street, London." },
      { q: "\"Bohemian Rhapsody\" first appeared on which Queen album?", o: ["A Night at the Opera", "News of the World", "Sheer Heart Attack", "A Day at the Races"], a: 0 },
      { kind: "cover", media: "rumours", crop: [36, 62, 1.8], q: "And this cover?", o: ["Fleetwood Mac, Rumours", "Fleetwood Mac, Tusk", "Stevie Nicks, Bella Donna", "Fleetwood Mac, Mirage"], a: 0 },
      { q: "\"Stairway to Heaven\" is on Led Zeppelin's…", o: ["Fourth album", "Second album", "Houses of the Holy", "Physical Graffiti"], a: 0 },
    ],
  },
  {
    id: "nineties-hiphop", title: "The 90s hip-hop quiz", blurb: "East coast, west coast, golden age.",
    qs: [
      { kind: "cover", media: "illmatic", crop: [35, 62, 2], q: "Whose album cover is this?", o: ["Nas, Illmatic", "Mobb Deep, The Infamous", "Jay-Z, Reasonable Doubt", "Big L, Lifestylez ov da Poor & Dangerous"], a: 0, n: "Nas as a child, over a Queensbridge street." },
      { q: "What was the Notorious B.I.G.'s debut album?", o: ["Ready to Die", "Life After Death", "Illmatic", "Reasonable Doubt"], a: 0 },
      { kind: "emoji", emoji: "🍸🧃", q: "Which 90s hit is this?", o: ["Gin and Juice", "Regulate", "California Love", "Nuthin' but a 'G' Thang"], a: 0, n: "Snoop Dogg, 1994." },
      { kind: "palette", media: "wu-tang", q: "Whose cover colours are these?", o: ["Enter the Wu-Tang (36 Chambers)", "Liquid Swords", "Only Built 4 Cuban Linx", "Ironman"], a: 0 },
      { q: "On which label did Tupac release All Eyez on Me?", o: ["Death Row", "Bad Boy", "Def Jam", "Ruthless"], a: 0 },
      { kind: "cover", media: "the-score", crop: [50, 52, 1.9], q: "And this cover?", o: ["Fugees, The Score", "Fugees, Blunted on Reality", "Wyclef Jean, The Carnival", "A Tribe Called Quest, Midnight Marauders"], a: 0 },
      { q: "What was Missy Elliott's debut album?", o: ["Supa Dupa Fly", "Da Real World", "Under Construction", "Miss E… So Addictive"], a: 0 },
    ],
  },
  {
    id: "bob-dylan", title: "The Bob Dylan quiz", blurb: "The answer is blowin' in the wind.",
    qs: [
      { kind: "cover", media: "freewheelin", crop: [50, 62, 1.8], q: "Which Dylan cover is this?", o: ["The Freewheelin' Bob Dylan", "The Times They Are a-Changin'", "Another Side of Bob Dylan", "Bob Dylan (1962)"], a: 0, n: "With Suze Rotolo on Jones Street, New York." },
      { q: "What was Bob Dylan's birth name?", o: ["Robert Zimmerman", "Robert Allen", "Robert Dillon", "Robert Zimmer"], a: 0 },
      { kind: "emoji", emoji: "🌬️🌬️❓", q: "Which Dylan song is this?", o: ["Blowin' in the Wind", "Idiot Wind", "Like a Rolling Stone", "Knockin' on Heaven's Door"], a: 0 },
      { kind: "palette", media: "blood-tracks", q: "Whose cover colours are these?", o: ["Blood on the Tracks", "Desire", "Planet Waves", "Street-Legal"], a: 0 },
      { q: "At which festival did Dylan famously go electric in 1965?", o: ["Newport Folk Festival", "Monterey Pop", "Woodstock", "Isle of Wight"], a: 0 },
      { kind: "cover", media: "blonde-on-blonde", crop: [50, 42, 1.6], q: "And this cover?", o: ["Blonde on Blonde", "Highway 61 Revisited", "Bringing It All Back Home", "John Wesley Harding"], a: 0, n: "The blur is said to come from the cold: Dylan and the photographer were shivering." },
      { q: "In which year did Dylan win the Nobel Prize in Literature?", o: ["2016", "2012", "2019", "2008"], a: 0 },
    ],
  },

  // Second batch (November 2026).
  {
    id: "radiohead", title: "The Radiohead quiz", blurb: "Everything in its right place.",
    qs: [
      { kind: "cover", media: "kid-a", crop: [50, 74, 1.9], q: "Which Radiohead cover is this?", o: ["Kid A", "Amnesiac", "Hail to the Thief", "The Bends"], a: 0 },
      { q: "Which band member scored There Will Be Blood?", o: ["Jonny Greenwood", "Thom Yorke", "Ed O'Brien", "Colin Greenwood"], a: 0 },
      { kind: "palette", media: "in-rainbows", q: "Whose cover colours are these?", o: ["In Rainbows", "A Moon Shaped Pool", "OK Computer", "The King of Limbs"], a: 0 },
      { kind: "emoji", emoji: "😰🤖", q: "Which Radiohead song is this?", o: ["Paranoid Android", "Karma Police", "Idioteque", "No Surprises"], a: 0 },
      { q: "How did Radiohead first release In Rainbows in 2007?", o: ["As a download, pay what you want", "Only on vinyl", "Free with a newspaper", "As a surprise CD in shops"], a: 0 },
      { q: "Which album opens with \"Airbag\"?", o: ["OK Computer", "The Bends", "Kid A", "Pablo Honey"], a: 0 },
      { kind: "emoji", emoji: "🪴🧴🌲", q: "And this song?", o: ["Fake Plastic Trees", "Everything in Its Right Place", "Street Spirit", "High and Dry"], a: 0 },
    ],
  },
  {
    id: "kate-bush", title: "The Kate Bush quiz", blurb: "Running up that hill, at last.",
    qs: [
      { kind: "cover", media: "hounds-of-love", crop: [50, 46, 2.6], q: "Which Kate Bush cover is this?", o: ["Hounds of Love", "The Dreaming", "Never for Ever", "The Sensual World"], a: 0 },
      { q: "Her first single (1978) was named after a novel. Which one?", o: ["Wuthering Heights", "Jane Eyre", "Rebecca", "Great Expectations"], a: 0 },
      { kind: "palette", media: "kick-inside", q: "Whose cover colours are these?", o: ["The Kick Inside", "Lionheart", "Never for Ever", "Aerial"], a: 0 },
      { kind: "emoji", emoji: "🏃‍♀️⛰️🤝", q: "Which Kate Bush song is this?", o: ["Running Up That Hill", "Cloudbusting", "This Woman's Work", "Wow"], a: 0 },
      { q: "Which TV series sent \"Running Up That Hill\" back to number one in 2022?", o: ["Stranger Things", "Euphoria", "The Crown", "Wednesday"], a: 0 },
      { q: "Which musician helped her get her first record deal as a teenager?", o: ["David Gilmour", "Peter Gabriel", "Elton John", "Brian Eno"], a: 0 },
      { kind: "emoji", emoji: "☁️👨‍👦🔧", q: "And this song?", o: ["Cloudbusting", "Wow", "Moments of Pleasure", "The Man with the Child in His Eyes"], a: 0, n: "About a father and his rain-making machine." },
    ],
  },
  {
    id: "noughties-indie", title: "The 2000s indie quiz", blurb: "Skinny jeans and loud guitars.",
    qs: [
      { kind: "cover", media: "funeral", crop: [44, 56, 1.7], q: "Whose album cover is this?", o: ["Arcade Fire, Funeral", "Arcade Fire, Neon Bible", "Fleet Foxes, Fleet Foxes", "Sufjan Stevens, Illinois"], a: 0 },
      { q: "Which band made Is This It (2001)?", o: ["The Strokes", "Interpol", "The Libertines", "Yeah Yeah Yeahs"], a: 0 },
      { kind: "palette", media: "bright-lights", q: "Whose cover colours are these?", o: ["Interpol, Turn On the Bright Lights", "The Strokes, Room on Fire", "The National, Boxer", "Editors, The Back Room"], a: 0 },
      { kind: "emoji", emoji: "🗺️", q: "Which 2000s song is this?", o: ["Maps", "Mr. Brightside", "Last Nite", "Take Me Out"], a: 0, n: "Yeah Yeah Yeahs, 2003." },
      { q: "Who recorded \"Mr. Brightside\"?", o: ["The Killers", "Franz Ferdinand", "Bloc Party", "Kings of Leon"], a: 0 },
      { kind: "emoji", emoji: "7️⃣🌍⚔️", q: "And this one?", o: ["Seven Nation Army", "Fell in Love with a Girl", "Icky Thump", "Hotel Yorba"], a: 0, n: "The White Stripes, 2003." },
      { q: "Which city did The Strokes come from?", o: ["New York", "London", "Detroit", "Montreal"], a: 0 },
    ],
  },
  {
    id: "soul", title: "The soul quiz", blurb: "Motown, Memphis and a lot of feeling.",
    qs: [
      { kind: "cover", media: "whats-going-on", crop: [28, 62, 1.8], q: "Whose album cover is this?", o: ["Marvin Gaye, What's Going On", "Marvin Gaye, Let's Get It On", "Stevie Wonder, Innervisions", "Curtis Mayfield, Superfly"], a: 0 },
      { q: "Motown was founded in which city?", o: ["Detroit", "Memphis", "Chicago", "Philadelphia"], a: 0 },
      { kind: "palette", media: "aretha-never", q: "Whose cover colours are these?", o: ["Aretha Franklin, I Never Loved a Man the Way I Love You", "Aretha Franklin, Lady Soul", "Nina Simone, Wild Is the Wind", "Etta James, At Last!"], a: 0 },
      { kind: "emoji", emoji: "🧍🫂", q: "Which soul classic is this?", o: ["Stand by Me", "Lean on Me", "My Girl", "Ain't No Sunshine"], a: 0, n: "Ben E. King, 1961." },
      { q: "Who wrote and first recorded \"Respect\", before Aretha made it hers?", o: ["Otis Redding", "Sam Cooke", "Ray Charles", "Smokey Robinson"], a: 0 },
      { kind: "emoji", emoji: "☀️🚫", q: "And this one?", o: ["Ain't No Sunshine", "Lovely Day", "Sunny", "Here Comes the Sun"], a: 0, n: "Bill Withers, 1971." },
      { q: "How old was Stevie Wonder when he signed to Motown?", o: ["11", "15", "18", "9"], a: 0 },
    ],
  },
];
