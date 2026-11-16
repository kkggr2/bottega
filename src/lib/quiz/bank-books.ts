import type { Quiz } from "./bank-types";

/*
 * Book and poetry quizzes: three facts, and four to play with — first lines and famous lines
 * (only from books old enough to be free to quote), and plots told in emoji.
 * Right answer first (a: 0); the server shuffles the options for each person.
 */

export const BOOKS: Quiz[] = [
  {
    id: "classic-books", title: "The classic books quiz", blurb: "The ones on every reading list.",
    qs: [
      { kind: "quote", quote: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", q: "Which novel opens like this?", o: ["Pride and Prejudice", "Emma", "Middlemarch", "Vanity Fair"], a: 0 },
      { q: "Who wrote Middlemarch?", o: ["George Eliot", "Elizabeth Gaskell", "Charlotte Brontë", "Anne Brontë"], a: 0, n: "George Eliot was the pen name of Mary Ann Evans." },
      { kind: "emoji", emoji: "🧪⚡🧟‍♂️🧊", q: "Which novel is this?", o: ["Frankenstein", "Dracula", "Strange Case of Dr Jekyll and Mr Hyde", "The Picture of Dorian Gray"], a: 0, n: "It ends in the Arctic ice." },
      { kind: "quote", quote: "Reader, I married him.", q: "Which novel is this line from?", o: ["Jane Eyre", "Wuthering Heights", "Villette", "Agnes Grey"], a: 0 },
      { q: "Raskolnikov is the hero of…", o: ["Crime and Punishment", "The Brothers Karamazov", "The Idiot", "Demons"], a: 0 },
      { kind: "quote", quote: "Call me Ishmael.", q: "Which novel opens like this?", o: ["Moby-Dick", "Treasure Island", "Robinson Crusoe", "Billy Budd"], a: 0 },
      { q: "Who narrates The Great Gatsby?", o: ["Nick Carraway", "Jay Gatsby", "Tom Buchanan", "Jordan Baker"], a: 0 },
    ],
  },
  {
    id: "murakami", title: "The Haruki Murakami quiz", blurb: "Cats, wells, jazz records and spaghetti.",
    qs: [
      { kind: "emoji", emoji: "🌙🌙", q: "Which Murakami novel is this?", o: ["1Q84", "Kafka on the Shore", "After Dark", "Killing Commendatore"], a: 0, n: "Two moons hang in the sky of 1Q84." },
      { q: "Norwegian Wood takes its name from a song by…", o: ["The Beatles", "The Beach Boys", "Simon & Garfunkel", "The Doors"], a: 0 },
      { kind: "emoji", emoji: "🐑🔍🏔️", q: "Which Murakami novel is this?", o: ["A Wild Sheep Chase", "Dance Dance Dance", "Hard-Boiled Wonderland and the End of the World", "Sputnik Sweetheart"], a: 0 },
      { kind: "emoji", emoji: "🐈❓🕳️🐦", q: "And this one?", o: ["The Wind-Up Bird Chronicle", "Kafka on the Shore", "Norwegian Wood", "South of the Border, West of the Sun"], a: 0, n: "A missing cat, a dry well, a bird that winds the world." },
      { q: "What was the name of the jazz bar Murakami ran in Tokyo?", o: ["Peter Cat", "Kafka", "Blue Note", "The Dolphin"], a: 0 },
      { kind: "emoji", emoji: "🔴🔵⚪⚫🚉", q: "Which Murakami novel is this?", o: ["Colorless Tsukuru Tazaki and His Years of Pilgrimage", "Norwegian Wood", "First Person Singular", "The City and Its Uncertain Walls"], a: 0, n: "His four friends' names each hold a colour; he builds train stations." },
      { q: "What was his first novel?", o: ["Hear the Wind Sing", "A Wild Sheep Chase", "Norwegian Wood", "Pinball, 1973"], a: 0 },
    ],
  },
  {
    id: "poetry", title: "The poetry quiz", blurb: "Lines you half remember.",
    qs: [
      { kind: "quote", quote: "I wandered lonely as a cloud", q: "Who wrote it?", o: ["William Wordsworth", "John Keats", "Percy Bysshe Shelley", "Samuel Taylor Coleridge"], a: 0 },
      { q: "Who wrote \"Do not go gentle into that good night\"?", o: ["Dylan Thomas", "W. B. Yeats", "Ted Hughes", "Seamus Heaney"], a: 0 },
      { kind: "emoji", emoji: "🐦‍⬛🚪🌑", q: "Which poem is this?", o: ["The Raven", "Annabel Lee", "The Bells", "Ulalume"], a: 0, n: "Edgar Allan Poe, 1845. Nevermore." },
      { kind: "quote", quote: "Because I could not stop for Death – He kindly stopped for me –", q: "Who wrote it?", o: ["Emily Dickinson", "Christina Rossetti", "Elizabeth Barrett Browning", "Edna St. Vincent Millay"], a: 0 },
      { q: "In which year was T. S. Eliot's The Waste Land published?", o: ["1922", "1915", "1930", "1939"], a: 0 },
      { kind: "quote", quote: "Two roads diverged in a yellow wood", q: "Who wrote it?", o: ["Robert Frost", "Walt Whitman", "Carl Sandburg", "Wallace Stevens"], a: 0 },
      { q: "In which language did Rumi write most of his poetry?", o: ["Persian", "Arabic", "Turkish", "Urdu"], a: 0 },
    ],
  },
  {
    id: "shakespeare", title: "The Shakespeare quiz", blurb: "Exit, pursued by a quiz.",
    qs: [
      { kind: "quote", quote: "Out, damned spot!", q: "Who says it?", o: ["Lady Macbeth", "Ophelia", "Desdemona", "Lady Capulet"], a: 0 },
      { q: "Which play has the stage direction \"Exit, pursued by a bear\"?", o: ["The Winter's Tale", "The Tempest", "A Midsummer Night's Dream", "As You Like It"], a: 0 },
      { kind: "emoji", emoji: "👑👴👧👧👧⛈️", q: "Which play is this?", o: ["King Lear", "Macbeth", "Hamlet", "Cymbeline"], a: 0 },
      { kind: "quote", quote: "All the world's a stage", q: "Which play is it from?", o: ["As You Like It", "Twelfth Night", "Much Ado About Nothing", "The Merchant of Venice"], a: 0 },
      { q: "What was the name of Shakespeare's wife?", o: ["Anne Hathaway", "Mary Arden", "Judith Quiney", "Susanna Hall"], a: 0, n: "Mary Arden was his mother." },
      { kind: "quote", quote: "Now is the winter of our discontent", q: "Which play opens with it?", o: ["Richard III", "Henry V", "Julius Caesar", "The Winter's Tale"], a: 0 },
      { q: "How many sonnets did Shakespeare publish?", o: ["154", "100", "126", "212"], a: 0 },
    ],
  },
  {
    id: "russian-novels", title: "The Russian novels quiz", blurb: "Long winters, longer books.",
    qs: [
      { kind: "quote", quote: "Happy families are all alike; every unhappy family is unhappy in its own way.", q: "Which novel opens like this?", o: ["Anna Karenina", "War and Peace", "Fathers and Sons", "The Brothers Karamazov"], a: 0 },
      { q: "Prince Myshkin is the hero of which Dostoevsky novel?", o: ["The Idiot", "Demons", "Crime and Punishment", "The Gambler"], a: 0 },
      { kind: "emoji", emoji: "🪓👵💰😰", q: "Which novel is this?", o: ["Crime and Punishment", "Notes from Underground", "Demons", "The Idiot"], a: 0 },
      { kind: "emoji", emoji: "😈🐈‍⬛🏙️📜🔥", q: "And this one?", o: ["The Master and Margarita", "Dead Souls", "Doctor Zhivago", "We"], a: 0, n: "The devil and a giant talking cat visit Moscow; a burned manuscript survives." },
      { q: "Which author was made to turn down the 1958 Nobel Prize?", o: ["Boris Pasternak", "Aleksandr Solzhenitsyn", "Ivan Bunin", "Mikhail Sholokhov"], a: 0 },
      { kind: "emoji", emoji: "👃🚶‍♂️🎩", q: "Which Gogol story is this?", o: ["The Nose", "The Overcoat", "Diary of a Madman", "Viy"], a: 0, n: "A man's nose leaves his face and walks around St Petersburg in uniform." },
      { q: "In Chekhov's Three Sisters, where do the sisters long to go?", o: ["Moscow", "Paris", "St Petersburg", "Italy"], a: 0 },
    ],
  },

  // Second batch (November 2026).
  {
    id: "agatha-christie", title: "The Agatha Christie quiz", blurb: "Who did it, and with what.",
    qs: [
      { kind: "emoji", emoji: "🚂❄️🔪", q: "Which Christie novel is this?", o: ["Murder on the Orient Express", "Death on the Nile", "The ABC Murders", "Evil Under the Sun"], a: 0 },
      { q: "What does Poirot credit for solving his cases?", o: ["His little grey cells", "His nose for lies", "His notebook", "His moustache"], a: 0 },
      { q: "In which village does Miss Marple live?", o: ["St Mary Mead", "Chipping Cleghorn", "Market Basing", "King's Abbot"], a: 0 },
      { kind: "emoji", emoji: "🏝️🔟😨", q: "And this one?", o: ["And Then There Were None", "Evil Under the Sun", "Peril at End House", "Crooked House"], a: 0, n: "Ten strangers on an island, one by one." },
      { q: "Which Christie play has run in London since 1952?", o: ["The Mousetrap", "Witness for the Prosecution", "Black Coffee", "Spider's Web"], a: 0 },
      { q: "For how long did Christie famously disappear in 1926?", o: ["Eleven days", "Three days", "A month", "Six months"], a: 0 },
      { kind: "emoji", emoji: "🚢🐫🔫", q: "Which novel is this?", o: ["Death on the Nile", "Murder in Mesopotamia", "Appointment with Death", "Cat Among the Pigeons"], a: 0 },
    ],
  },
  {
    id: "jane-austen", title: "The Jane Austen quiz", blurb: "Balls, letters and second chances.",
    qs: [
      { kind: "quote", quote: "Emma Woodhouse, handsome, clever, and rich", q: "Which novel opens like this?", o: ["Emma", "Persuasion", "Mansfield Park", "Northanger Abbey"], a: 0 },
      { q: "Which novel did Austen first call First Impressions?", o: ["Pride and Prejudice", "Sense and Sensibility", "Persuasion", "Emma"], a: 0 },
      { kind: "emoji", emoji: "🏰📖😱", q: "Which Austen novel is this?", o: ["Northanger Abbey", "Mansfield Park", "Persuasion", "Sanditon"], a: 0, n: "A young reader who sees a gothic novel in everything." },
      { q: "In Persuasion, who writes Anne the famous letter?", o: ["Captain Wentworth", "Mr Elliot", "Admiral Croft", "Captain Benwick"], a: 0 },
      { kind: "emoji", emoji: "👭💔🌧️", q: "And this one?", o: ["Sense and Sensibility", "Pride and Prejudice", "Emma", "Lady Susan"], a: 0, n: "Two sisters; one is caught in the rain." },
      { q: "Where is Jane Austen buried?", o: ["Winchester Cathedral", "Westminster Abbey", "Bath Abbey", "St Paul's Cathedral"], a: 0 },
      { q: "Which Bank of England note carries her portrait?", o: ["£10", "£5", "£20", "£50"], a: 0 },
    ],
  },
  {
    id: "latin-american", title: "The Latin American books quiz", blurb: "Magic, memory and long families.",
    qs: [
      { kind: "emoji", emoji: "🏘️🦋💛⏳", q: "Which novel is this?", o: ["One Hundred Years of Solitude", "Love in the Time of Cholera", "Chronicle of a Death Foretold", "The Autumn of the Patriarch"], a: 0, n: "Yellow butterflies follow Mauricio Babilonia." },
      { q: "What is the town in One Hundred Years of Solitude called?", o: ["Macondo", "Comala", "Santa María", "Aracataca"], a: 0, n: "Aracataca is García Márquez's real birthplace." },
      { kind: "emoji", emoji: "💌⛵👴👵", q: "And this one?", o: ["Love in the Time of Cholera", "No One Writes to the Colonel", "Of Love and Other Demons", "Leaf Storm"], a: 0, n: "He waits more than fifty years for her." },
      { q: "In which year did García Márquez win the Nobel Prize?", o: ["1982", "1967", "1990", "1971"], a: 0 },
      { q: "Which Argentine writer made Ficciones?", o: ["Jorge Luis Borges", "Julio Cortázar", "Adolfo Bioy Casares", "Ernesto Sabato"], a: 0 },
      { kind: "emoji", emoji: "🔪📜⏰", q: "Which García Márquez book is this?", o: ["Chronicle of a Death Foretold", "The General in His Labyrinth", "One Hundred Years of Solitude", "News of a Kidnapping"], a: 0, n: "Everyone in town knows the murder is coming." },
      { q: "Which Mexican novel is set in the ghost town of Comala?", o: ["Pedro Páramo", "Aura", "Like Water for Chocolate", "The Labyrinth of Solitude"], a: 0, n: "Juan Rulfo, 1955." },
    ],
  },
  {
    id: "turkish-literature", title: "The Turkish literature quiz", blurb: "From İnce Memed to the Museum of Innocence.",
    qs: [
      { q: "Which Turkish writer won the Nobel Prize in 2006?", o: ["Orhan Pamuk", "Yaşar Kemal", "Elif Şafak", "Ahmet Hamdi Tanpınar"], a: 0 },
      { kind: "emoji", emoji: "🦅🏔️🔫", q: "Which novel is this?", o: ["İnce Memed", "Kuyucaklı Yusuf", "Tutunamayanlar", "Saatleri Ayarlama Enstitüsü"], a: 0, n: "Yaşar Kemal's bandit of the Taurus mountains." },
      { q: "Who wrote Saatleri Ayarlama Enstitüsü (The Time Regulation Institute)?", o: ["Ahmet Hamdi Tanpınar", "Oğuz Atay", "Sait Faik Abasıyanık", "Halit Ziya Uşaklıgil"], a: 0 },
      { kind: "emoji", emoji: "🏛️🚬💔", q: "Which Pamuk novel is this?", o: ["Masumiyet Müzesi", "Kar", "Benim Adım Kırmızı", "Kara Kitap"], a: 0, n: "The Museum of Innocence: a real museum in Istanbul too." },
      { q: "Who wrote Kürk Mantolu Madonna (Madonna in a Fur Coat)?", o: ["Sabahattin Ali", "Sait Faik Abasıyanık", "Orhan Kemal", "Peyami Safa"], a: 0 },
      { q: "Which poet wrote Memleketimden İnsan Manzaraları?", o: ["Nazım Hikmet", "Orhan Veli", "Cemal Süreya", "Attilâ İlhan"], a: 0 },
      { kind: "emoji", emoji: "❄️🏙️✍️", q: "And this Pamuk novel?", o: ["Kar", "Masumiyet Müzesi", "Beyaz Kale", "Kafamda Bir Tuhaflık"], a: 0, n: "Snow: a poet stuck in Kars." },
    ],
  },
];
