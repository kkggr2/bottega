import type { Quiz } from "./bank-types";

/* Book and poetry quizzes. Right answer first (a: 0); the server shuffles the options for each person. */

export const BOOKS: Quiz[] = [
  {
    id: "classic-books", title: "The classic books quiz", blurb: "The ones on every reading list.",
    qs: [
      { q: "Which novel opens with \"Call me Ishmael\"?", o: ["Moby-Dick", "Treasure Island", "The Old Man and the Sea", "Robinson Crusoe"], a: 0 },
      { q: "Who wrote Middlemarch?", o: ["George Eliot", "Elizabeth Gaskell", "Charlotte Brontë", "Anne Brontë"], a: 0, n: "George Eliot was the pen name of Mary Ann Evans." },
      { q: "In which Jane Austen novel does Mr Knightley appear?", o: ["Emma", "Persuasion", "Sense and Sensibility", "Mansfield Park"], a: 0 },
      { q: "Raskolnikov is the hero of…", o: ["Crime and Punishment", "The Brothers Karamazov", "The Idiot", "Demons"], a: 0 },
      { q: "Who narrates The Great Gatsby?", o: ["Nick Carraway", "Jay Gatsby", "Tom Buchanan", "Jordan Baker"], a: 0 },
      { q: "Frankenstein's subtitle is \"The Modern…\"", o: ["Prometheus", "Icarus", "Faust", "Pygmalion"], a: 0 },
      { q: "Who tells most of Wuthering Heights to Mr Lockwood?", o: ["Nelly Dean", "Isabella Linton", "Catherine Earnshaw", "Heathcliff"], a: 0 },
    ],
  },
  {
    id: "murakami", title: "The Haruki Murakami quiz", blurb: "Cats, wells, jazz records and spaghetti.",
    qs: [
      { q: "Norwegian Wood takes its name from a song by…", o: ["The Beatles", "The Beach Boys", "Simon & Garfunkel", "The Doors"], a: 0 },
      { q: "What was the name of the jazz bar Murakami ran in Tokyo?", o: ["Peter Cat", "Kafka", "Blue Note", "The Dolphin"], a: 0 },
      { q: "What was his first novel?", o: ["Hear the Wind Sing", "A Wild Sheep Chase", "Norwegian Wood", "Pinball, 1973"], a: 0 },
      { q: "How old is Kafka Tamura in Kafka on the Shore?", o: ["15", "17", "19", "13"], a: 0 },
      { q: "The title 1Q84 plays on a novel by…", o: ["George Orwell", "Aldous Huxley", "Franz Kafka", "Ray Bradbury"], a: 0, n: "In Japanese, the number 9 and the letter Q sound alike." },
      { q: "What goes missing at the start of The Wind-Up Bird Chronicle?", o: ["The cat", "A record", "A sister", "The narrator's job"], a: 0 },
      { q: "In Norwegian Wood, which woman stays at a sanatorium in the mountains?", o: ["Naoko", "Midori", "Hatsumi", "Kumiko"], a: 0 },
    ],
  },
  {
    id: "poetry", title: "The poetry quiz", blurb: "Lines you half remember.",
    qs: [
      { q: "Who wrote \"Do not go gentle into that good night\"?", o: ["Dylan Thomas", "W. B. Yeats", "Ted Hughes", "Seamus Heaney"], a: 0 },
      { q: "In which year was T. S. Eliot's The Waste Land published?", o: ["1922", "1915", "1930", "1939"], a: 0 },
      { q: "\"Hope\" is the thing with feathers — whose poem?", o: ["Emily Dickinson", "Christina Rossetti", "Elizabeth Bishop", "Sylvia Plath"], a: 0 },
      { q: "In which language did Rumi write most of his poetry?", o: ["Persian", "Arabic", "Turkish", "Urdu"], a: 0 },
      { q: "Who wrote \"The Road Not Taken\"?", o: ["Robert Frost", "Walt Whitman", "Carl Sandburg", "Wallace Stevens"], a: 0 },
      { q: "Which Sylvia Plath collection came out after her death?", o: ["Ariel", "The Colossus", "The Bell Jar", "Birthday Letters"], a: 0, n: "Birthday Letters is Ted Hughes's; The Bell Jar is a novel." },
      { q: "Pablo Neruda came from which country?", o: ["Chile", "Argentina", "Peru", "Colombia"], a: 0 },
    ],
  },
  {
    id: "shakespeare", title: "The Shakespeare quiz", blurb: "Exit, pursued by a quiz.",
    qs: [
      { q: "Which play has the stage direction \"Exit, pursued by a bear\"?", o: ["The Winter's Tale", "The Tempest", "A Midsummer Night's Dream", "As You Like It"], a: 0 },
      { q: "What was the name of Shakespeare's wife?", o: ["Anne Hathaway", "Mary Arden", "Judith Quiney", "Susanna Hall"], a: 0, n: "Mary Arden was his mother." },
      { q: "How many sonnets did Shakespeare publish?", o: ["154", "100", "126", "212"], a: 0 },
      { q: "In which year was the Globe Theatre built?", o: ["1599", "1564", "1616", "1623"], a: 0, n: "1564 is his birth year, 1616 his death." },
      { q: "Which play is set on Prospero's island?", o: ["The Tempest", "Twelfth Night", "Pericles", "Cymbeline"], a: 0 },
      { q: "Romeo and Juliet is set in which city?", o: ["Verona", "Venice", "Padua", "Mantua"], a: 0, n: "Romeo is banished to Mantua." },
      { q: "Which character says \"To be, or not to be\"?", o: ["Hamlet", "Macbeth", "King Lear", "Othello"], a: 0 },
    ],
  },
  {
    id: "russian-novels", title: "The Russian novels quiz", blurb: "Long winters, longer books.",
    qs: [
      { q: "Prince Myshkin is the hero of which Dostoevsky novel?", o: ["The Idiot", "Demons", "Crime and Punishment", "The Gambler"], a: 0 },
      { q: "In which novel does the devil, Woland, visit Moscow?", o: ["The Master and Margarita", "Dead Souls", "Doctor Zhivago", "Fathers and Sons"], a: 0 },
      { q: "Who buys up dead serfs in Gogol's Dead Souls?", o: ["Chichikov", "Oblomov", "Bazarov", "Pechorin"], a: 0 },
      { q: "Which author was made to turn down the 1958 Nobel Prize?", o: ["Boris Pasternak", "Aleksandr Solzhenitsyn", "Ivan Bunin", "Mikhail Sholokhov"], a: 0 },
      { q: "Who is the clumsy, searching count at the heart of War and Peace?", o: ["Pierre Bezukhov", "Andrei Bolkonsky", "Nikolai Rostov", "Anatole Kuragin"], a: 0 },
      { q: "In Chekhov's Three Sisters, where do the sisters long to go?", o: ["Moscow", "Paris", "St Petersburg", "Italy"], a: 0 },
      { q: "In which city was Nabokov's Lolita first published?", o: ["Paris", "New York", "London", "Berlin"], a: 0, n: "By Olympia Press, in 1955." },
    ],
  },
];
