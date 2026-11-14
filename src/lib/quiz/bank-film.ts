import type { Quiz } from "./bank-types";

/*
 * Film quizzes. The right answer is always written first (a: 0); the server shuffles the options
 * for each person. Keep facts checkable, and keep the notes to one short line.
 */

export const FILM: Quiz[] = [
  {
    id: "david-lynch", title: "The David Lynch quiz", blurb: "Red rooms, ringing ears, damn fine coffee.",
    qs: [
      { q: "In which US state is the town of Twin Peaks?", o: ["Washington", "Oregon", "Montana", "Idaho"], a: 0, n: "It sits just south of the Canadian border." },
      { q: "What was Lynch's first feature film?", o: ["Eraserhead", "The Elephant Man", "Blue Velvet", "Dune"], a: 0, n: "Eraserhead came out in 1977, after years of shooting at night." },
      { q: "Who plays FBI Special Agent Dale Cooper?", o: ["Kyle MacLachlan", "Jack Nance", "Ray Wise", "Michael Ontkean"], a: 0 },
      { q: "Mulholland Drive won Lynch Best Director at which festival in 2001?", o: ["Cannes", "Venice", "Berlin", "Sundance"], a: 0, n: "He shared it with Joel Coen." },
      { q: "Whose 1963 recording of \"Blue Velvet\" went to number one in the US?", o: ["Bobby Vinton", "Roy Orbison", "Tony Bennett", "Elvis Presley"], a: 0 },
      { q: "The Elephant Man got eight Oscar nominations. How many did it win?", o: ["None", "One", "Three", "Five"], a: 0 },
      { q: "Which composer scored Blue Velvet, Twin Peaks and Mulholland Drive?", o: ["Angelo Badalamenti", "Howard Shore", "Danny Elfman", "Ennio Morricone"], a: 0 },
    ],
  },
  {
    id: "christopher-nolan", title: "The Christopher Nolan quiz", blurb: "Time runs strangely here.",
    qs: [
      { q: "What was Nolan's first feature film?", o: ["Following", "Memento", "Insomnia", "Doodlebug"], a: 0, n: "Following (1998) was shot on weekends for about $6,000." },
      { q: "In Inception, what is Cobb's totem?", o: ["A spinning top", "A loaded die", "A chess bishop", "A poker chip"], a: 0, n: "The die is Arthur's; the bishop is Ariadne's." },
      { q: "How many Oscars did Oppenheimer win?", o: ["Seven", "Five", "Nine", "Eleven"], a: 0 },
      { q: "Which Nolan film remakes a 1997 Norwegian thriller?", o: ["Insomnia", "Memento", "The Prestige", "Following"], a: 0 },
      { q: "In Interstellar, what does Cooper turn TARS's humour setting down to?", o: ["75%", "50%", "90%", "60%"], a: 0, n: "From 100%." },
      { q: "Which musician plays Nikola Tesla in The Prestige?", o: ["David Bowie", "Sting", "Mick Jagger", "Tom Waits"], a: 0 },
      { q: "In Dunkirk, how long does the story on the beach (\"The Mole\") cover?", o: ["One week", "One day", "One hour", "One night"], a: 0, n: "The sea covers a day, the air an hour." },
    ],
  },
  {
    id: "studio-ghibli", title: "The Studio Ghibli quiz", blurb: "Soot sprites welcome.",
    qs: [
      { q: "In which year was Studio Ghibli founded?", o: ["1985", "1979", "1991", "1997"], a: 0 },
      { q: "Which Ghibli film won the studio's first Oscar?", o: ["Spirited Away", "Princess Mononoke", "My Neighbor Totoro", "Howl's Moving Castle"], a: 0, n: "Best Animated Feature, 2003." },
      { q: "What is the name of Kiki's black cat?", o: ["Jiji", "Luna", "Totoro", "Kurosuke"], a: 0 },
      { q: "Who directed Grave of the Fireflies?", o: ["Isao Takahata", "Hayao Miyazaki", "Goro Miyazaki", "Hiromasa Yonebayashi"], a: 0 },
      { q: "Howl's Moving Castle is based on a novel by…", o: ["Diana Wynne Jones", "Ursula K. Le Guin", "Mary Norton", "Philippa Pearce"], a: 0, n: "Mary Norton wrote The Borrowers, the source of Arrietty." },
      { q: "What does Porco Rosso do for a living?", o: ["Flies a seaplane as a bounty hunter", "Runs a café", "Builds airships", "Sails a fishing boat"], a: 0 },
      { q: "What name is Chihiro given in the bathhouse in Spirited Away?", o: ["Sen", "Lin", "Yubaba", "Haku"], a: 0 },
    ],
  },
  {
    id: "wes-anderson", title: "The Wes Anderson quiz", blurb: "Symmetry, pastel, a slow zoom.",
    qs: [
      { q: "What was Wes Anderson's first feature?", o: ["Bottle Rocket", "Rushmore", "The Royal Tenenbaums", "The Life Aquatic"], a: 0 },
      { q: "The Grand Budapest Hotel stands in which made-up country?", o: ["Zubrowka", "Sylvania", "Latveria", "Freedonia"], a: 0 },
      { q: "Who narrates The Royal Tenenbaums?", o: ["Alec Baldwin", "Bill Murray", "Owen Wilson", "Jeff Goldblum"], a: 0 },
      { q: "Fantastic Mr. Fox is based on a book by…", o: ["Roald Dahl", "Beatrix Potter", "Kenneth Grahame", "A. A. Milne"], a: 0 },
      { q: "Who plays Max Fischer in Rushmore?", o: ["Jason Schwartzman", "Owen Wilson", "Luke Wilson", "Edward Norton"], a: 0 },
      { q: "On which island does Moonrise Kingdom take place?", o: ["New Penzance", "Martha's Vineyard", "Nantucket", "Isle of Dogs"], a: 0 },
      { q: "Asteroid City takes place in which year?", o: ["1955", "1962", "1947", "1969"], a: 0 },
    ],
  },
  {
    id: "hitchcock", title: "The Hitchcock quiz", blurb: "Don't take a shower first.",
    qs: [
      { q: "Which Hitchcock film won the Oscar for Best Picture?", o: ["Rebecca", "Psycho", "Vertigo", "Rear Window"], a: 0, n: "His only Best Picture winner, from 1940." },
      { q: "Vertigo is set in which city?", o: ["San Francisco", "Los Angeles", "New York", "Chicago"], a: 0 },
      { q: "Who composed the score for Psycho?", o: ["Bernard Herrmann", "Max Steiner", "John Williams", "Miklós Rózsa"], a: 0 },
      { q: "North by Northwest ends with a chase across which monument?", o: ["Mount Rushmore", "The Statue of Liberty", "The Hoover Dam", "The Golden Gate Bridge"], a: 0 },
      { q: "The Birds is based on a story by…", o: ["Daphne du Maurier", "Patricia Highsmith", "Agatha Christie", "Shirley Jackson"], a: 0, n: "Du Maurier also wrote Rebecca." },
      { q: "Who plays the photographer stuck in his apartment in Rear Window?", o: ["James Stewart", "Cary Grant", "Gregory Peck", "Henry Fonda"], a: 0 },
      { q: "What is the name of the motel in Psycho?", o: ["Bates Motel", "Crane Motel", "Fairvale Inn", "Phoenix Lodge"], a: 0 },
    ],
  },
  {
    id: "eighties-films", title: "The 80s movies quiz", blurb: "Big hair, bigger soundtracks.",
    qs: [
      { q: "In Back to the Future, how fast must the DeLorean go to travel in time?", o: ["88 mph", "77 mph", "99 mph", "121 mph"], a: 0 },
      { q: "On which day of the week is The Breakfast Club's detention?", o: ["Saturday", "Friday", "Sunday", "Monday"], a: 0 },
      { q: "Which sweets does Elliott use to lure E.T.?", o: ["Reese's Pieces", "M&M's", "Skittles", "Jelly beans"], a: 0 },
      { q: "In which year is Blade Runner set?", o: ["2019", "2049", "2001", "2032"], a: 0 },
      { q: "Whose Ferrari does Ferris Bueller borrow?", o: ["Cameron's father's", "His own father's", "Principal Rooney's", "Sloane's mother's"], a: 0 },
      { q: "What is the name of the resort in Dirty Dancing?", o: ["Kellerman's", "Grossinger's", "The Catskill Inn", "Houseman's"], a: 0 },
      { q: "What giant shape does the Ghostbusters' final villain take?", o: ["The Stay Puft Marshmallow Man", "A giant Twinkie", "A walking skyscraper", "A sea monster"], a: 0 },
    ],
  },
  {
    id: "turkish-cinema", title: "The Turkish cinema quiz", blurb: "From Yeşilçam to Cannes.",
    qs: [
      { q: "Which Nuri Bilge Ceylan film won the Palme d'Or in 2014?", o: ["Kış Uykusu (Winter Sleep)", "Ahlat Ağacı (The Wild Pear Tree)", "Üç Maymun (Three Monkeys)", "Uzak (Distant)"], a: 0 },
      { q: "Yol shared the 1982 Palme d'Or. Who wrote it?", o: ["Yılmaz Güney", "Atıf Yılmaz", "Ömer Kavur", "Lütfi Akad"], a: 0, n: "He wrote it from prison; Şerif Gören directed on set." },
      { q: "Who directed the first Hababam Sınıfı (1975)?", o: ["Ertem Eğilmez", "Kartal Tibet", "Zeki Ökten", "Osman F. Seden"], a: 0 },
      { q: "Kemal Sunal's best-loved character is called…", o: ["Şaban", "Hababam", "Tosun Paşa", "Kibar Feyzo"], a: 0 },
      { q: "Who directed Neredesin Firuze (2004)?", o: ["Ezel Akay", "Yılmaz Erdoğan", "Cem Yılmaz", "Ferzan Özpetek"], a: 0 },
      { q: "Bir Zamanlar Anadolu'da won which prize at Cannes in 2011?", o: ["The Grand Prix", "The Palme d'Or", "Best Director", "The Jury Prize"], a: 0 },
      { q: "Which actress is known as \"Sultan\"?", o: ["Türkan Şoray", "Hülya Koçyiğit", "Filiz Akın", "Fatma Girik"], a: 0 },
    ],
  },
  {
    id: "pixar", title: "The Pixar quiz", blurb: "To infinity and a little further.",
    qs: [
      { q: "In which year did Toy Story come out?", o: ["1995", "1993", "1997", "1999"], a: 0 },
      { q: "What is the talking dog in Up called?", o: ["Dug", "Kevin", "Alpha", "Rex"], a: 0, n: "Kevin is the bird." },
      { q: "What is the restaurant in Ratatouille called?", o: ["Gusteau's", "Le Rat", "Chez Remy", "Skinner's"], a: 0 },
      { q: "How many emotions run Riley's headquarters in the first Inside Out?", o: ["Five", "Four", "Six", "Seven"], a: 0, n: "Joy, Sadness, Anger, Fear and Disgust." },
      { q: "Which holiday is Coco built around?", o: ["Día de Muertos", "Cinco de Mayo", "Christmas", "Carnival"], a: 0 },
      { q: "Pixar's hopping desk lamp first starred in which short?", o: ["Luxo Jr.", "Geri's Game", "Tin Toy", "For the Birds"], a: 0 },
      { q: "The code A113, hidden in many Pixar films, is a classroom at…", o: ["CalArts", "UCLA", "NYU", "Stanford"], a: 0 },
    ],
  },
  {
    id: "kubrick", title: "The Stanley Kubrick quiz", blurb: "One-point perspective, all the way down.",
    qs: [
      { q: "What is the computer in 2001: A Space Odyssey called?", o: ["HAL 9000", "MU-TH-UR", "Skynet", "WOPR"], a: 0 },
      { q: "What is the hotel in The Shining called?", o: ["The Overlook", "The Stanley", "The Timberline", "The Gold Room"], a: 0, n: "The Gold Room is its ballroom." },
      { q: "What is the slang spoken in A Clockwork Orange called?", o: ["Nadsat", "Newspeak", "Polari", "Cant"], a: 0 },
      { q: "How many roles does Peter Sellers play in Dr. Strangelove?", o: ["Three", "Two", "Four", "One"], a: 0 },
      { q: "Barry Lyndon's candlelit scenes used lenses first made for…", o: ["NASA", "The US Navy", "Leica", "Kodak"], a: 0 },
      { q: "What was Kubrick's last film?", o: ["Eyes Wide Shut", "Full Metal Jacket", "The Shining", "A.I. Artificial Intelligence"], a: 0, n: "A.I. was finished by Spielberg." },
      { q: "Who plays the drill instructor in Full Metal Jacket?", o: ["R. Lee Ermey", "Matthew Modine", "Vincent D'Onofrio", "Adam Baldwin"], a: 0 },
    ],
  },
  {
    id: "modern-indie", title: "The modern indie film quiz", blurb: "Small budgets, big feelings.",
    qs: [
      { q: "Which film won Best Picture after the La La Land envelope mix-up?", o: ["Moonlight", "Manchester by the Sea", "Arrival", "Hidden Figures"], a: 0 },
      { q: "Which duo directed Everything Everywhere All at Once?", o: ["Daniels", "The Safdies", "The Coens", "The Russos"], a: 0 },
      { q: "Lady Bird is set in which city?", o: ["Sacramento", "Fresno", "San Diego", "Portland"], a: 0 },
      { q: "Who directed Aftersun?", o: ["Charlotte Wells", "Joanna Hogg", "Andrea Arnold", "Céline Sciamma"], a: 0 },
      { q: "Who directed Hereditary?", o: ["Ari Aster", "Robert Eggers", "Jordan Peele", "David Lowery"], a: 0 },
      { q: "The Florida Project's motel sits near which place?", o: ["Walt Disney World", "Cape Canaveral", "Miami Beach", "The Everglades"], a: 0 },
      { q: "Who wrote and directed Past Lives?", o: ["Celine Song", "Lulu Wang", "Chloé Zhao", "Kogonada"], a: 0 },
    ],
  },
];
