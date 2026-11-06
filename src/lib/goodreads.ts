/** Reads the CSV that Goodreads gives you under My Books → Import and export → Export library. */

export type GoodreadsBook = {
  id: string;
  title: string;
  subtitle: string;
  cover_url: string | null;
  rating: number;
  shelf: string;
  favorite: boolean;
  link: string;
};

/** A small RFC 4180 CSV parser: quoted fields, doubled quotes, and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

/** Goodreads writes ISBNs as ="0143039954" so spreadsheets keep the leading zeros. */
const cleanIsbn = (s: string) => s.replace(/[="\s-]/g, "");

export function readGoodreadsExport(text: string): GoodreadsBook[] {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  if (!header) return [];
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const at = {
    id: col("Book Id"), title: col("Title"), author: col("Author"), isbn: col("ISBN"), isbn13: col("ISBN13"),
    rating: col("My Rating"), shelf: col("Exclusive Shelf"), shelves: col("Bookshelves"),
    original: col("Original Publication Year"), published: col("Year Published"),
  };
  if (at.title < 0 || at.author < 0) throw new Error("not a Goodreads export");

  return rows.map((r) => {
    const get = (i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
    const isbn = cleanIsbn(get(at.isbn13)) || cleanIsbn(get(at.isbn));
    const year = get(at.original) || get(at.published);
    // Series titles look like "Dune (Dune, #1)"; the series part is noise on a spine.
    const title = get(at.title).replace(/\s*\([^)]*#\d+(\.\d+)?\)\s*$/, "");
    const id = get(at.id);
    return {
      id: id || `${title}-${get(at.author)}`,
      title,
      subtitle: [get(at.author), year].filter(Boolean).join(" · "),
      cover_url: /^\d{10}(\d{3})?$/.test(isbn) ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false` : null,
      rating: Number(get(at.rating)) || 0,
      shelf: get(at.shelf) || "read",
      favorite: /(^|,\s*)favou?rites?(,|$)/i.test(get(at.shelves)),
      link: /^\d+$/.test(id) ? `https://www.goodreads.com/book/show/${id}` : "",
    };
  }).filter((b) => b.title);
}
