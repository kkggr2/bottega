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

  // Second batch (November 2026).
  {
    id: "tarantino", title: "The Tarantino quiz", blurb: "Long talks, sudden endings.",
    qs: [
      { kind: "still", media: "pulp-fiction", q: "Which Tarantino film is this?", o: ["Pulp Fiction", "Jackie Brown", "Reservoir Dogs", "Death Proof"], a: 0 },
      { q: "In Reservoir Dogs, which colour name does Steve Buscemi's character hate?", o: ["Mr. Pink", "Mr. Brown", "Mr. Orange", "Mr. Blonde"], a: 0 },
      { kind: "emoji", emoji: "🎞️🎟️🔥🇩🇪", q: "Which Tarantino film is this?", o: ["Inglourious Basterds", "Django Unchained", "The Hateful Eight", "Kill Bill: Vol. 2"], a: 0, n: "It ends with a Paris cinema in flames." },
      { kind: "palette", media: "kill-bill", q: "Whose colours are these?", o: ["Kill Bill: Vol. 1", "Death Proof", "Jackie Brown", "Django Unchained"], a: 0 },
      { q: "Tarantino has two Oscars for Best Original Screenplay: Pulp Fiction and…", o: ["Django Unchained", "Inglourious Basterds", "Once Upon a Time in Hollywood", "The Hateful Eight"], a: 0 },
      { kind: "quote", quote: "Say \"what\" again.", q: "Who says it?", o: ["Jules Winnfield", "Vincent Vega", "Marsellus Wallace", "Butch Coolidge"], a: 0 },
      { q: "In Pulp Fiction, what's in the glowing briefcase?", o: ["It's never revealed", "Gold bars", "Diamonds", "A stack of cash"], a: 0 },
    ],
  },
  {
    id: "wong-kar-wai", title: "The Wong Kar-wai quiz", blurb: "Neon, rain and missed chances.",
    qs: [
      { kind: "still", media: "fallen-angels", q: "Which Wong Kar-wai film is this?", o: ["Fallen Angels", "Chungking Express", "Days of Being Wild", "2046"], a: 0 },
      { q: "Which film follows on from In the Mood for Love?", o: ["2046", "Happy Together", "Ashes of Time", "My Blueberry Nights"], a: 0 },
      { kind: "emoji", emoji: "🍍🥫📅👮", q: "Which film is this?", o: ["Chungking Express", "Fallen Angels", "As Tears Go By", "Happy Together"], a: 0, n: "A heartbroken cop buys tins of pineapple that expire on 1 May." },
      { kind: "palette", media: "mood-for-love", q: "Whose colours are these?", o: ["In the Mood for Love", "2046", "Happy Together", "The Grandmaster"], a: 0 },
      { q: "Who shot most of his 1990s films?", o: ["Christopher Doyle", "Roger Deakins", "Emmanuel Lubezki", "Darius Khondji"], a: 0 },
      { q: "Happy Together takes place mostly in which city?", o: ["Buenos Aires", "Hong Kong", "Taipei", "Lisbon"], a: 0 },
      { q: "Which song plays over and over in Chungking Express?", o: ["California Dreamin'", "Dream a Little Dream of Me", "Monday, Monday", "Creeque Alley"], a: 0 },
    ],
  },
  {
    id: "sofia-coppola", title: "The Sofia Coppola quiz", blurb: "Hotel rooms, pastel cakes, quiet girls.",
    qs: [
      { kind: "still", media: "lost-translation", q: "Which Sofia Coppola film is this?", o: ["Lost in Translation", "Somewhere", "The Bling Ring", "On the Rocks"], a: 0 },
      { q: "Which of her films is about the Lisbon sisters?", o: ["The Virgin Suicides", "The Beguiled", "Marie Antoinette", "Priscilla"], a: 0 },
      { kind: "palette", media: "marie-antoinette", q: "Whose colours are these?", o: ["Marie Antoinette", "The Beguiled", "Priscilla", "The Virgin Suicides"], a: 0 },
      { kind: "emoji", emoji: "👰‍♀️🎸🏰", q: "Which film is this?", o: ["Priscilla", "Somewhere", "The Bling Ring", "On the Rocks"], a: 0, n: "Life inside Graceland." },
      { q: "She won the Oscar for Best Original Screenplay for…", o: ["Lost in Translation", "The Virgin Suicides", "Somewhere", "Marie Antoinette"], a: 0 },
      { q: "In Somewhere, what does Stephen Dorff's character do?", o: ["He's a film star", "He's a novelist", "He runs a hotel", "He's a photographer"], a: 0 },
      { kind: "emoji", emoji: "💎👜🏠📸", q: "And this one?", o: ["The Bling Ring", "Marie Antoinette", "The Beguiled", "On the Rocks"], a: 0, n: "Teenagers who burgled celebrities' houses." },
    ],
  },
  {
    id: "almodovar", title: "The Almodóvar quiz", blurb: "Red walls, mothers and melodrama.",
    qs: [
      { kind: "still", media: "all-about-mother", q: "Which Almodóvar film is this?", o: ["All About My Mother", "Volver", "Talk to Her", "Julieta"], a: 0 },
      { q: "Who plays Raimunda in Volver?", o: ["Penélope Cruz", "Marisa Paredes", "Rossy de Palma", "Emma Suárez"], a: 0 },
      { kind: "palette", media: "pain-glory", q: "Whose colours are these?", o: ["Pain and Glory", "Parallel Mothers", "Julieta", "The Skin I Live In"], a: 0 },
      { kind: "emoji", emoji: "🩰😴🏥", q: "Which film is this?", o: ["Talk to Her", "Bad Education", "Broken Embraces", "Live Flesh"], a: 0, n: "Two men keep watch over two women in comas." },
      { q: "Which Oscar did All About My Mother win?", o: ["Best Foreign Language Film", "Best Original Screenplay", "Best Director", "Best Actress"], a: 0, n: "His screenplay Oscar came later, for Talk to Her." },
      { q: "Who plays the film director Salvador Mallo in Pain and Glory?", o: ["Antonio Banderas", "Javier Bardem", "Gael García Bernal", "Eduardo Noriega"], a: 0 },
      { kind: "emoji", emoji: "💃😵‍💫☎️🍅", q: "And this one?", o: ["Women on the Verge of a Nervous Breakdown", "Tie Me Up! Tie Me Down!", "High Heels", "Kika"], a: 0, n: "A spiked gazpacho, and an answering machine." },
    ],
  },
  {
    id: "french-new-wave", title: "The French New Wave quiz", blurb: "Jump cuts and Gauloises.",
    qs: [
      { kind: "still", media: "breathless", q: "Which film is this?", o: ["Breathless", "The 400 Blows", "Jules and Jim", "Cléo from 5 to 7"], a: 0 },
      { q: "Who directed The 400 Blows?", o: ["François Truffaut", "Jean-Luc Godard", "Claude Chabrol", "Éric Rohmer"], a: 0 },
      { kind: "emoji", emoji: "👨👨👩🚲", q: "Which film is this?", o: ["Jules and Jim", "Band of Outsiders", "Contempt", "Pierrot le Fou"], a: 0, n: "Two friends, one woman, many years." },
      { q: "In Breathless, what does Patricia sell on the Champs-Élysées?", o: ["The New York Herald Tribune", "Le Monde", "Flowers", "Ice cream"], a: 0 },
      { q: "In Cléo from 5 to 7, what is the singer Cléo waiting for?", o: ["Her medical test results", "A lover's train", "A record deal", "A telegram from home"], a: 0 },
      { q: "Which Godard film stars Brigitte Bardot?", o: ["Contempt", "Breathless", "Alphaville", "Pierrot le Fou"], a: 0 },
      { kind: "emoji", emoji: "🏃‍♂️🏃‍♀️🏃‍♂️🏛️", q: "And this one?", o: ["Band of Outsiders", "Masculin Féminin", "Alphaville", "Vivre sa vie"], a: 0, n: "Three friends race through the Louvre." },
    ],
  },
  {
    id: "coen-brothers", title: "The Coen brothers quiz", blurb: "Snow, bowling and bad luck.",
    qs: [
      { kind: "still", media: "fargo", q: "Which Coen film is this?", o: ["Fargo", "No Country for Old Men", "A Serious Man", "Inside Llewyn Davis"], a: 0 },
      { q: "Who plays Marge Gunderson in Fargo?", o: ["Frances McDormand", "Holly Hunter", "Laura Dern", "Kathryn Hahn"], a: 0 },
      { kind: "palette", media: "lebowski", q: "Whose colours are these?", o: ["The Big Lebowski", "Barton Fink", "The Hudsucker Proxy", "Burn After Reading"], a: 0 },
      { kind: "quote", quote: "Call it, friendo.", q: "Who says it?", o: ["Anton Chigurh", "Llewelyn Moss", "Ed Tom Bell", "Carson Wells"], a: 0 },
      { kind: "emoji", emoji: "🐈🎸❄️", q: "Which film is this?", o: ["Inside Llewyn Davis", "O Brother, Where Art Thou?", "A Serious Man", "Hail, Caesar!"], a: 0, n: "A folk singer, a borrowed cat and a cold New York winter." },
      { q: "Which Coen film won Best Picture?", o: ["No Country for Old Men", "Fargo", "True Grit", "Barton Fink"], a: 0 },
      { kind: "emoji", emoji: "⛓️🏃‍♂️🏃‍♂️🏃‍♂️🎶", q: "And this one?", o: ["O Brother, Where Art Thou?", "Raising Arizona", "The Ladykillers", "Blood Simple"], a: 0 },
    ],
  },
];
