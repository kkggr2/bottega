import type { NextRequest } from "next/server";
import { TmdbMissingToken, movieBasics } from "@/lib/tmdb";

/*
 * GET /api/import/letterboxd?user=name
 * Reads a member's public Letterboxd feed (their recent diary) and returns the films with TMDB posters.
 * Only public data is read, and every film links back to Letterboxd.
 */

const MAX_FILMS = 40;

type Entry = {
  tmdbId: number;
  title: string;
  year: string;
  rating: number | null;
  liked: boolean;
  watched: string;
  link: string;
};

const tag = (item: string, name: string) =>
  item.match(new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`))?.[1]?.trim() ?? "";

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");

function parseFeed(xml: string): Entry[] {
  const seen = new Set<number>();
  const entries: Entry[] = [];
  for (const item of xml.split("<item>").slice(1)) {
    const tmdbId = Number(tag(item, "tmdb:movieId"));
    if (!tmdbId || seen.has(tmdbId)) continue; // lists and duplicates (rewatches)
    seen.add(tmdbId);
    const rating = parseFloat(tag(item, "letterboxd:memberRating"));
    const link = tag(item, "link");
    entries.push({
      tmdbId,
      title: decode(tag(item, "letterboxd:filmTitle")),
      year: tag(item, "letterboxd:filmYear"),
      rating: Number.isFinite(rating) ? rating : null,
      liked: tag(item, "letterboxd:memberLike") === "Yes",
      watched: tag(item, "letterboxd:watchedDate"),
      link: link.startsWith("https://letterboxd.com/") ? link.replace(/\/[^/]+\/film\//, "/film/") : `https://letterboxd.com/tmdb/${tmdbId}/`,
    });
    if (entries.length >= MAX_FILMS) break;
  }
  return entries;
}

export async function GET(request: NextRequest) {
  const user = (request.nextUrl.searchParams.get("user") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{2,30}$/.test(user)) {
    return Response.json({ error: "That doesn't look like a Letterboxd username." }, { status: 400 });
  }

  const res = await fetch(`https://letterboxd.com/${user}/rss/`, {
    headers: { "User-Agent": "Bottega/1.0 (+https://bottegarooms.com)" },
  });
  if (res.status === 404) return Response.json({ error: `No Letterboxd member called ${user}.` }, { status: 404 });
  if (!res.ok) return Response.json({ error: "Letterboxd didn't answer. Try again in a minute." }, { status: 502 });

  const entries = parseFeed(await res.text());
  if (!entries.length) {
    return Response.json({ error: `${user} has no public diary entries yet.` }, { status: 404 });
  }

  try {
    const films = await Promise.all(
      entries.map(async (e) => {
        const basics = await movieBasics(e.tmdbId).catch(() => null);
        return {
          id: String(e.tmdbId),
          title: e.title || basics?.title || "Untitled",
          subtitle: [basics?.directors, e.year || basics?.year].filter(Boolean).join(" · "),
          cover_url: basics?.poster_url ?? null,
          rating: e.rating,
          liked: e.liked,
          watched: e.watched,
          link: e.link,
        };
      }),
    );
    return Response.json({ user, films });
  } catch (error) {
    const status = error instanceof TmdbMissingToken ? 501 : 502;
    return Response.json({ error: "Couldn't look up the posters right now." }, { status });
  }
}
