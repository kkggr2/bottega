import "server-only";

/** TMDB lookups. Server-only: the read token never reaches the browser. */

const TMDB = "https://api.themoviedb.org/3";
export const TMDB_IMG = "https://image.tmdb.org/t/p";

export class TmdbMissingToken extends Error {}

export async function tmdb<T>(path: string): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new TmdbMissingToken("TMDB_READ_TOKEN is not set");
  const res = await fetch(`${TMDB}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json() as Promise<T>;
}

export const yearOf = (date?: string) => (date ? date.slice(0, 4) : "");

/** Director(s), poster and year for one film, for imports that already know the TMDB id. */
export async function movieBasics(id: number) {
  const d = await tmdb<{
    title: string; release_date?: string; poster_path?: string | null;
    credits?: { crew: { name: string; job: string }[] };
  }>(`/movie/${id}?append_to_response=credits`);
  const directors = (d.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name);
  return {
    title: d.title,
    directors: directors.slice(0, 2).join(" & "),
    year: yearOf(d.release_date),
    poster_url: d.poster_path ? `${TMDB_IMG}/w500${d.poster_path}` : null,
  };
}
