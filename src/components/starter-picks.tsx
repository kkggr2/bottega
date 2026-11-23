"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { friendlyError, supabase } from "@/lib/supabase";
import { MAX_PIECES } from "@/lib/themes";
import { track } from "@/lib/track";
import type { Piece, PieceType } from "@/lib/types";
import { Sheet } from "./sheet";

/*
 * A new room in a minute: tap the films and books you love, and they go up together.
 * Searching one at a time is where most new people gave up, so this comes first. The "why" lines come later.
 */

type Pick = { type: PieceType; title: string; subtitle: string; cover_url: string };

const film = (title: string, year: string, path: string): Pick =>
  ({ type: "poster", title, subtitle: year, cover_url: `https://image.tmdb.org/t/p/w500/${path}.jpg` });
const book = (title: string, author: string, id: number): Pick =>
  ({ type: "book", title, subtitle: author, cover_url: `https://covers.openlibrary.org/b/id/${id}-L.jpg` });

const FILMS: Pick[] = [
  film("Spirited Away", "2001", "39wmItIWsg5sZMyRUHLkWBcuVCM"),
  film("Pride & Prejudice", "2005", "o8UhmEbWPHmTUxP0lMuCoqNkbB3"),
  film("Interstellar", "2014", "yQvGrMoipbRoddT0ZR8tPoR7NfX"),
  film("La La Land", "2016", "uDO8zWDhfWwoFdKS4fzkUJt0Rf0"),
  film("The Godfather", "1972", "3bhkrj58Vtu7enYsRolD1fZdja1"),
  film("Amélie", "2001", "nSxDa3M9aMvGVLoItzWTepQ5h5d"),
  film("Before Sunrise", "1995", "kf1Jb1c2JAOqjuzA3H4oDM263uB"),
  film("Parasite", "2019", "7IiTTgloJzvGI1TAYymCfbfl3vT"),
  film("Pulp Fiction", "1994", "vQWk5YBFWF4bZaofAbv0tShwBvQ"),
  film("Little Women", "2019", "yn5ihODtZ7ofn8pDYfxCmxh8AXI"),
  film("The Dark Knight", "2008", "qJ2tW6WMUDux911r6m7haRef0WH"),
  film("Call Me by Your Name", "2017", "gXiE0WveDnT0n5J4sW9TMxXF4oT"),
  film("Eternal Sunshine of the Spotless Mind", "2004", "5MwkWH9tYHv3mV9OdYTMR5qreIz"),
  film("Lady Bird", "2017", "gl66K7zRdtNYGrxyS2YDUP5ASZd"),
  film("Inception", "2010", "xlaY2zyzMfkhk0HSC5VUwzoZPU1"),
  film("In the Mood for Love", "2000", "8BgGbbWiLNhPtkMkN0gGTnbtvBv"),
  film("Titanic", "1997", "9xjZS2rlVxm8SFx8kPC3aIGCOYQ"),
  film("Past Lives", "2023", "k3waqVXSnvCZWfJYNtdamTgTtTA"),
  film("Whiplash", "2014", "7fn624j5lj3xTme2SgiLCeuedmO"),
  film("Harry Potter and the Philosopher's Stone", "2001", "wuMc08IPKEatf9rnMNXvIDxqP4W"),
  film("The Lord of the Rings: The Fellowship of the Ring", "2001", "6oom5QYQ2yQTMJIbnvbkBL9cHo6"),
  film("The Grand Budapest Hotel", "2014", "eWdyYQreja6JGCzqHWXpWHDrrPo"),
  film("Dead Poets Society", "1989", "erzbMlcNHOdx24AXOcn2ZKA7R1q"),
  film("Her", "2013", "eCOtqtfvn7mxGl6nfmq4b1exJRc"),
  film("Good Will Hunting", "1997", "z2FnLKpFi1HPO7BEJxdkv6hpJSU"),
  film("Howl's Moving Castle", "2004", "13kOl2v0nD2OLbVSHnHk8GUFEhO"),
  film("Fight Club", "1999", "jSziioSwPVrOy9Yow3XhWIBDjq1"),
  film("Mamma Mia!", "2008", "xYLiCWmAMHJubx5jNZ7HuXKjAbV"),
];

const BOOKS: Pick[] = [
  book("Pride and Prejudice", "Jane Austen", 14348537),
  book("The Secret History", "Donna Tartt", 744854),
  book("Normal People", "Sally Rooney", 8794265),
  book("Madonna in a Fur Coat", "Sabahattin Ali", 12762238),
  book("The Great Gatsby", "F. Scott Fitzgerald", 10590366),
  book("The Bell Jar", "Sylvia Plath", 8477115),
  book("Little Women", "Louisa May Alcott", 8775559),
  book("Norwegian Wood", "Haruki Murakami", 2237620),
  book("The Seven Husbands of Evelyn Hugo", "Taylor Jenkins Reid", 8354226),
  book("Nineteen Eighty-Four", "George Orwell", 9267242),
  book("To Kill a Mockingbird", "Harper Lee", 14351077),
  book("The Master and Margarita", "Mikhail Bulgakov", 12947486),
  book("The Stranger", "Albert Camus", 13151269),
  book("On the Road", "Jack Kerouac", 34655),
];

const key = (p: Pick) => `${p.type}:${p.title}`;

export function StarterPicks({ ownerId, pieces, onClose }: { ownerId: string; pieces: Piece[]; onClose: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<"films" | "books">("films");
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const have = new Set(pieces.map((p) => `${p.type}:${p.title}`));
  const space = MAX_PIECES - pieces.length;
  const list = tab === "films" ? FILMS : BOOKS;

  function toggle(p: Pick) {
    const k = key(p);
    setChosen((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : prev.length < space ? [...prev, k] : prev);
  }

  async function save() {
    const picked = [...FILMS, ...BOOKS].filter((p) => chosen.includes(key(p)));
    if (!picked.length) return;
    setBusy(true);
    setError(null);
    const base = Date.now() / 1000;
    const rows = picked.map((p, i) => ({
      owner_id: ownerId, type: p.type, title: p.title, subtitle: p.subtitle, body: "", cover_url: p.cover_url, link: null,
      position: base + i / 1000,
    }));
    const { error: err } = await supabase().from("pieces").insert(rows);
    setBusy(false);
    if (err) return setError(t(friendlyError(err, "Couldn't add them.")));
    track("import", { room: ownerId, detail: `starter:${rows.length}` });
    onClose();
  }

  const n = chosen.length;
  return (
    <Sheet onClose={onClose} onSubmit={save} label={t("Tap the ones you love")}>
      <h2>{t("Tap the ones you love")}</h2>
      <p className="muted">{t("They go up in your room together. You can add your own and write why later.")}</p>
      <div className="chips" role="group" aria-label={t("Show")}>
        <button type="button" className="chip" aria-pressed={tab === "films"} onClick={() => setTab("films")}>{t("Films")}</button>
        <button type="button" className="chip" aria-pressed={tab === "books"} onClick={() => setTab("books")}>{t("Books")}</button>
      </div>
      <ul className="starter-grid" aria-label={tab === "films" ? t("Films") : t("Books")}>
        {list.map((p) => {
          const k = key(p);
          const inRoom = have.has(k);
          const on = inRoom || chosen.includes(k);
          return (
            <li key={k}>
              <button type="button" className={on ? "on" : undefined} aria-pressed={on} disabled={inRoom}
                onClick={() => toggle(p)} aria-label={`${p.title}, ${p.subtitle}`}>
                <img src={p.cover_url} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                {on && <span className="tick" aria-hidden="true">✓</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="msg err" aria-live="polite">{error}</p>
      <div className="row split starter-foot">
        <button className="btn ghost" type="button" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" type="submit" disabled={busy || n === 0}>
          {busy ? t("Hanging…") : n === 0 ? t("Pick a few") : n === 1 ? t("Hang 1") : t("Hang {n}", { n })}
        </button>
      </div>
    </Sheet>
  );
}
