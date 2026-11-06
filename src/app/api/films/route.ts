import type { NextRequest } from "next/server";
import { TMDB_IMG as IMG, TmdbMissingToken, tmdb, yearOf as year } from "@/lib/tmdb";

/*
 * Film and TV lookups through TMDB. The token stays on the server; the browser only sees results.
 *   GET /api/films?q=paris texas          → matches
 *   GET /api/films?id=movie:655           → director, poster, stills and trailer for one title
 */

type Media = "movie" | "tv";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  try {
    const id = params.get("id");
    if (id) return Response.json(await details(id));

    const q = (params.get("q") ?? "").trim().slice(0, 100);
    if (q.length < 2) return Response.json({ results: [] });
    return Response.json({ results: await search(q) });
  } catch (error) {
    const missing = error instanceof TmdbMissingToken;
    return Response.json(
      { error: missing ? "Film search isn't set up yet." : "Film search is unavailable right now." },
      { status: missing ? 501 : 502 },
    );
  }
}

async function search(q: string) {
  const data = await tmdb<{
    results: {
      id: number; media_type: string; title?: string; name?: string;
      release_date?: string; first_air_date?: string; poster_path?: string | null;
    }[];
  }>(`/search/multi?include_adult=false&query=${encodeURIComponent(q)}`);

  return data.results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 10)
    .map((r) => ({
      id: `${r.media_type}:${r.id}`,
      title: r.title ?? r.name ?? "Untitled",
      subtitle: [r.media_type === "tv" ? "TV series" : "", year(r.release_date ?? r.first_air_date)].filter(Boolean).join(" · "),
      cover_url: r.poster_path ? `${IMG}/w185${r.poster_path}` : null,
    }));
}

async function details(id: string) {
  const [media, num] = id.split(":") as [Media, string];
  if ((media !== "movie" && media !== "tv") || !/^\d+$/.test(num)) throw new Error("bad id");

  const d = await tmdb<{
    title?: string; name?: string; release_date?: string; first_air_date?: string;
    poster_path?: string | null; backdrop_path?: string | null;
    created_by?: { name: string }[];
    credits?: { crew: { name: string; job: string }[] };
    videos?: { results: { site: string; type: string; key: string; official: boolean }[] };
    images?: { backdrops: { file_path: string }[] };
  }>(`/${media}/${num}?append_to_response=credits,videos,images&include_image_language=null,en`);

  const directors = media === "movie"
    ? (d.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name)
    : (d.created_by ?? []).map((c) => c.name);
  const videos = (d.videos?.results ?? []).filter((v) => v.site === "YouTube");
  const trailer = videos.find((v) => v.type === "Trailer" && v.official) ?? videos.find((v) => v.type === "Trailer") ?? videos[0];

  return {
    id,
    title: d.title ?? d.name ?? "Untitled",
    subtitle: [directors.slice(0, 2).join(" & "), year(d.release_date ?? d.first_air_date)].filter(Boolean).join(" · "),
    poster_url: d.poster_path ? `${IMG}/w500${d.poster_path}` : null,
    stills: [d.backdrop_path, ...(d.images?.backdrops ?? []).map((b) => b.file_path)]
      .filter((p, i, all): p is string => Boolean(p) && all.indexOf(p) === i)
      .slice(0, 12)
      .map((p) => `${IMG}/w780${p}`),
    trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    link: `https://www.themoviedb.org/${media}/${num}`,
  };
}
