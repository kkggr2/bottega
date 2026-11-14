import type { Quiz } from "./bank-types";

/*
 * Film quizzes: three facts, and four questions you play with your eyes and memory
 * (a frame, a colour palette, a line, a plot in emoji).
 * The right answer is always written first (a: 0); the server shuffles the options for each person.
 * Pictures and palettes come from media.ts by key. Keep quotes to a few words.
 */

export const FILM: Quiz[] = [
  {
    id: "david-lynch", title: "The David Lynch quiz", blurb: "Red rooms, ringing ears, damn fine coffee.",
    qs: [
      { kind: "still", media: "blue-velvet", q: "Which Lynch film is this frame from?", o: ["Blue Velvet", "Wild at Heart", "Lost Highway", "Mulholland Drive"], a: 0, n: "Isabella Rossellini sings at the Slow Club." },
      { q: "In which US state is the town of Twin Peaks?", o: ["Washington", "Oregon", "Montana", "Idaho"], a: 0 },
      { kind: "emoji", emoji: "👴🚜🛣️⭐", q: "Which Lynch film is this?", o: ["The Straight Story", "Wild at Heart", "Lost Highway", "Eraserhead"], a: 0, n: "An old man crosses two states on a lawn mower to see his brother." },
      { kind: "palette", media: "mulholland", q: "Whose colours are these?", o: ["Mulholland Drive", "Inland Empire", "Lost Highway", "Eraserhead"], a: 0 },
      { q: "What was Lynch's first feature film?", o: ["Eraserhead", "The Elephant Man", "Blue Velvet", "Dune"], a: 0 },
      { kind: "quote", quote: "That's a damn fine cup of coffee.", q: "Who says it?", o: ["Dale Cooper", "Harry Truman", "Audrey Horne", "Leland Palmer"], a: 0 },
      { q: "Which composer scored Blue Velvet, Twin Peaks and Mulholland Drive?", o: ["Angelo Badalamenti", "Howard Shore", "Danny Elfman", "Ennio Morricone"], a: 0 },
    ],
  },
  {
    id: "christopher-nolan", title: "The Christopher Nolan quiz", blurb: "Time runs strangely here.",
    qs: [
      { kind: "still", media: "interstellar", q: "Which Nolan film is this?", o: ["Interstellar", "Inception", "Tenet", "Insomnia"], a: 0, n: "The ice planet was filmed in Iceland." },
      { q: "In Inception, what is Cobb's totem?", o: ["A spinning top", "A loaded die", "A chess bishop", "A poker chip"], a: 0 },
      { kind: "emoji", emoji: "📸📝🧠🔁", q: "Which Nolan film is this?", o: ["Memento", "Following", "The Prestige", "Tenet"], a: 0, n: "A man with no short-term memory, told backwards." },
      { kind: "palette", media: "dark-knight", q: "Whose colours are these?", o: ["The Dark Knight", "Batman Begins", "Dunkirk", "Oppenheimer"], a: 0 },
      { q: "In Interstellar, what does Cooper turn TARS's humour setting down to?", o: ["75%", "50%", "90%", "60%"], a: 0, n: "From 100%." },
      { kind: "quote", quote: "Why so serious?", q: "Who says it?", o: ["The Joker", "Bane", "Two-Face", "The Scarecrow"], a: 0 },
      { q: "Which musician plays Nikola Tesla in The Prestige?", o: ["David Bowie", "Sting", "Mick Jagger", "Tom Waits"], a: 0 },
    ],
  },
  {
    id: "studio-ghibli", title: "The Studio Ghibli quiz", blurb: "Soot sprites welcome.",
    qs: [
      { kind: "still", media: "mononoke", q: "Which Ghibli film is this?", o: ["Princess Mononoke", "Nausicaä of the Valley of the Wind", "Castle in the Sky", "The Wind Rises"], a: 0 },
      { q: "What is the name of Kiki's black cat?", o: ["Jiji", "Luna", "Totoro", "Kurosuke"], a: 0 },
      { kind: "emoji", emoji: "🐷✈️🇮🇹", q: "Which Ghibli film is this?", o: ["Porco Rosso", "The Wind Rises", "Castle in the Sky", "Kiki's Delivery Service"], a: 0, n: "A pig flies seaplanes over the Adriatic." },
      { kind: "palette", media: "ponyo", q: "Whose colours are these?", o: ["Ponyo", "Arrietty", "Whisper of the Heart", "From Up on Poppy Hill"], a: 0 },
      { q: "In which year was Studio Ghibli founded?", o: ["1985", "1979", "1991", "1997"], a: 0 },
      { kind: "emoji", emoji: "👧🐉🛁🏮", q: "And this one?", o: ["Spirited Away", "My Neighbor Totoro", "Howl's Moving Castle", "The Cat Returns"], a: 0, n: "Chihiro works in a bathhouse for spirits; Haku is a dragon." },
      { q: "Who directed Grave of the Fireflies?", o: ["Isao Takahata", "Hayao Miyazaki", "Goro Miyazaki", "Hiromasa Yonebayashi"], a: 0 },
    ],
  },
  {
    id: "wes-anderson", title: "The Wes Anderson quiz", blurb: "Symmetry, pastel, a slow zoom.",
    qs: [
      { kind: "still", media: "grand-budapest", q: "Which Wes Anderson film is this?", o: ["The Grand Budapest Hotel", "The French Dispatch", "Asteroid City", "Isle of Dogs"], a: 0 },
      { q: "Who narrates The Royal Tenenbaums?", o: ["Alec Baldwin", "Bill Murray", "Owen Wilson", "Jeff Goldblum"], a: 0 },
      { kind: "emoji", emoji: "🚂🇮🇳👨👨👨🧳", q: "Which Wes Anderson film is this?", o: ["The Darjeeling Limited", "The Life Aquatic", "Bottle Rocket", "The Royal Tenenbaums"], a: 0, n: "Three brothers, one train, eleven matching suitcases." },
      { kind: "palette", media: "moonrise", q: "Whose colours are these?", o: ["Moonrise Kingdom", "Asteroid City", "Rushmore", "Fantastic Mr. Fox"], a: 0 },
      { q: "Who plays Max Fischer in Rushmore?", o: ["Jason Schwartzman", "Owen Wilson", "Luke Wilson", "Edward Norton"], a: 0 },
      { kind: "quote", quote: "Keep your hands off my lobby boy!", q: "Who says it?", o: ["M. Gustave", "Zero Moustafa", "Dmitri", "Deputy Kovacs"], a: 0 },
      { q: "What was Wes Anderson's first feature?", o: ["Bottle Rocket", "Rushmore", "The Royal Tenenbaums", "The Life Aquatic"], a: 0 },
    ],
  },
  {
    id: "hitchcock", title: "The Hitchcock quiz", blurb: "Don't take a shower first.",
    qs: [
      { kind: "still", media: "vertigo", q: "Which Hitchcock film is this?", o: ["Vertigo", "Marnie", "Notorious", "To Catch a Thief"], a: 0, n: "Kim Novak in Ernie's restaurant, against the red walls." },
      { q: "Which Hitchcock film won the Oscar for Best Picture?", o: ["Rebecca", "Psycho", "Vertigo", "Rear Window"], a: 0 },
      { kind: "emoji", emoji: "🚂🤝🔁🔪", q: "Which Hitchcock film is this?", o: ["Strangers on a Train", "Rope", "The Lady Vanishes", "Shadow of a Doubt"], a: 0, n: "Two strangers, one idea: swap murders." },
      { kind: "palette", media: "rear-window", q: "Whose colours are these?", o: ["Rear Window", "Rope", "Dial M for Murder", "The Trouble with Harry"], a: 0 },
      { q: "Who composed the score for Psycho?", o: ["Bernard Herrmann", "Max Steiner", "John Williams", "Miklós Rózsa"], a: 0 },
      { kind: "quote", quote: "A boy's best friend is his mother.", q: "Which film is it from?", o: ["Psycho", "Rebecca", "Spellbound", "Frenzy"], a: 0 },
      { q: "The Birds is based on a story by…", o: ["Daphne du Maurier", "Patricia Highsmith", "Agatha Christie", "Shirley Jackson"], a: 0 },
    ],
  },
  {
    id: "eighties-films", title: "The 80s movies quiz", blurb: "Big hair, bigger soundtracks.",
    qs: [
      { kind: "still", media: "ferris", q: "Which 80s film is this?", o: ["Ferris Bueller's Day Off", "The Breakfast Club", "Sixteen Candles", "Pretty in Pink"], a: 0, n: "A day off at the Art Institute of Chicago." },
      { q: "In Back to the Future, how fast must the DeLorean go to travel in time?", o: ["88 mph", "77 mph", "99 mph", "121 mph"], a: 0 },
      { kind: "emoji", emoji: "🚲🌕👽🍬", q: "Which 80s film is this?", o: ["E.T. the Extra-Terrestrial", "Explorers", "Gremlins", "Flight of the Navigator"], a: 0 },
      { kind: "palette", media: "blade-runner", q: "Whose colours are these?", o: ["Blade Runner", "Tron", "The Terminator", "Aliens"], a: 0 },
      { q: "On which day of the week is The Breakfast Club's detention?", o: ["Saturday", "Friday", "Sunday", "Monday"], a: 0 },
      { kind: "quote", quote: "Nobody puts Baby in a corner.", q: "Who says it?", o: ["Johnny Castle", "Ren McCormack", "Jake Ryan", "Duckie"], a: 0 },
      { q: "What giant shape does the Ghostbusters' final villain take?", o: ["The Stay Puft Marshmallow Man", "A giant Twinkie", "A walking skyscraper", "A sea monster"], a: 0 },
    ],
  },
  {
    id: "turkish-cinema", title: "The Turkish cinema quiz", blurb: "From Yeşilçam to Cannes.",
    qs: [
      { kind: "still", media: "winter-sleep", q: "Which film is this snowy Cappadocia from?", o: ["Kış Uykusu (Winter Sleep)", "Ahlat Ağacı (The Wild Pear Tree)", "Kuru Otlar Üstüne (About Dry Grasses)", "Uzak (Distant)"], a: 0, n: "It won the Palme d'Or in 2014." },
      { q: "Kemal Sunal's best-loved character is called…", o: ["Şaban", "Hababam", "Tosun Paşa", "Kibar Feyzo"], a: 0 },
      { kind: "emoji", emoji: "🏫😈😈😈👨‍🏫", q: "Which classic is this?", o: ["Hababam Sınıfı", "Tosun Paşa", "Süt Kardeşler", "Gülen Gözler"], a: 0 },
      { kind: "palette", media: "anatolia", q: "Whose colours are these?", o: ["Bir Zamanlar Anadolu'da", "Kış Uykusu", "Yumurta", "Sonbahar"], a: 0, n: "A night-long search across the steppe for a buried body." },
      { q: "Yol shared the 1982 Palme d'Or. Who wrote it?", o: ["Yılmaz Güney", "Atıf Yılmaz", "Ömer Kavur", "Lütfi Akad"], a: 0, n: "He wrote it from prison; Şerif Gören directed on set." },
      { kind: "emoji", emoji: "👧👧👧👧👧🏠🔒⚽", q: "Which film is this?", o: ["Mustang", "Kelebeğin Rüyası", "Babam ve Oğlum", "Ayla"], a: 0, n: "Five sisters locked in at home sneak out to a football match." },
      { q: "Which actress is known as \"Sultan\"?", o: ["Türkan Şoray", "Hülya Koçyiğit", "Filiz Akın", "Fatma Girik"], a: 0 },
    ],
  },
  {
    id: "pixar", title: "The Pixar quiz", blurb: "To infinity and a little further.",
    qs: [
      { kind: "still", media: "ratatouille", q: "Which Pixar film is this?", o: ["Ratatouille", "Luca", "Soul", "Onward"], a: 0 },
      { q: "In which year did Toy Story come out?", o: ["1995", "1993", "1997", "1999"], a: 0 },
      { kind: "emoji", emoji: "👴🎈🏠🐦", q: "Which Pixar film is this?", o: ["Up", "Coco", "Brave", "Elemental"], a: 0 },
      { kind: "palette", media: "wall-e", q: "Whose colours are these?", o: ["WALL·E", "Lightyear", "Elemental", "Soul"], a: 0 },
      { q: "Pixar's hopping desk lamp first starred in which short?", o: ["Luxo Jr.", "Geri's Game", "Tin Toy", "For the Birds"], a: 0 },
      { kind: "quote", quote: "Just keep swimming.", q: "Who says it?", o: ["Dory", "Marlin", "Crush", "Gill"], a: 0 },
      { q: "The code A113, hidden in many Pixar films, is a classroom at…", o: ["CalArts", "UCLA", "NYU", "Stanford"], a: 0 },
    ],
  },
  {
    id: "kubrick", title: "The Stanley Kubrick quiz", blurb: "One-point perspective, all the way down.",
    qs: [
      { kind: "still", media: "barry-lyndon", q: "Which Kubrick film is this, lit only by candles?", o: ["Barry Lyndon", "Paths of Glory", "Spartacus", "Eyes Wide Shut"], a: 0 },
      { q: "What is the hotel in The Shining called?", o: ["The Overlook", "The Stanley", "The Timberline", "The Gold Room"], a: 0 },
      { kind: "emoji", emoji: "🤠💣📞☢️", q: "Which Kubrick film is this?", o: ["Dr. Strangelove", "Paths of Glory", "The Killing", "Fear and Desire"], a: 0, n: "A cowboy rides the bomb all the way down." },
      { kind: "palette", media: "shining", q: "Whose colours are these?", o: ["The Shining", "A Clockwork Orange", "Lolita", "Full Metal Jacket"], a: 0 },
      { q: "What is the slang spoken in A Clockwork Orange called?", o: ["Nadsat", "Newspeak", "Polari", "Cant"], a: 0 },
      { kind: "quote", quote: "I'm sorry, Dave. I'm afraid I can't do that.", q: "Who says it?", o: ["HAL 9000", "Dave Bowman", "Frank Poole", "Dr. Floyd"], a: 0 },
      { q: "What was Kubrick's last film?", o: ["Eyes Wide Shut", "Full Metal Jacket", "The Shining", "A.I. Artificial Intelligence"], a: 0, n: "A.I. was finished by Spielberg." },
    ],
  },
  {
    id: "modern-indie", title: "The modern indie film quiz", blurb: "Small budgets, big feelings.",
    qs: [
      { kind: "still", media: "moonlight", q: "Which film is this?", o: ["Moonlight", "Waves", "Minari", "The Last Black Man in San Francisco"], a: 0 },
      { q: "Lady Bird is set in which city?", o: ["Sacramento", "Fresno", "San Diego", "Portland"], a: 0 },
      { kind: "emoji", emoji: "🥯🌀👀🌭🖐️", q: "Which film is this?", o: ["Everything Everywhere All at Once", "Swiss Army Man", "The Farewell", "Minari"], a: 0, n: "The everything bagel, googly eyes, hot dog fingers." },
      { kind: "palette", media: "florida-project", q: "Whose colours are these?", o: ["The Florida Project", "Lady Bird", "Aftersun", "Moonlight"], a: 0 },
      { q: "Who directed Hereditary?", o: ["Ari Aster", "Robert Eggers", "Jordan Peele", "David Lowery"], a: 0 },
      { kind: "emoji", emoji: "👨👧🏖️📼🇹🇷", q: "And this one?", o: ["Aftersun", "Past Lives", "The Worst Person in the World", "Somewhere"], a: 0, n: "A father and daughter on holiday in Turkey, remembered through a camcorder." },
      { q: "Who wrote and directed Past Lives?", o: ["Celine Song", "Lulu Wang", "Chloé Zhao", "Kogonada"], a: 0 },
    ],
  },
];
