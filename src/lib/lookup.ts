/** Search services that answer straight from the browser, with no keys. */

export type Found = {
  id: string;
  title: string;
  subtitle: string;
  cover_url: string | null;
  preview_url?: string | null;
  link?: string | null;
};

const year = (date?: string | number | null) => (date ? String(date).slice(0, 4) : "");
const join = (...parts: (string | undefined | null)[]) => parts.filter(Boolean).join(" · ");

/** Songs from Apple's iTunes Search, with cover art and a 30-second preview. */
export async function searchSongs(term: string, signal?: AbortSignal): Promise<Found[]> {
  const url = `https://itunes.apple.com/search?entity=song&limit=10&term=${encodeURIComponent(term)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("search failed");
  const data = (await res.json()) as {
    results: {
      trackId: number; trackName: string; artistName: string; releaseDate?: string;
      artworkUrl100?: string; previewUrl?: string; trackViewUrl?: string;
    }[];
  };
  return data.results.map((r) => ({
    id: String(r.trackId),
    title: r.trackName,
    subtitle: join(r.artistName, year(r.releaseDate)),
    // Apple serves any size from the same path; 600px is plenty for a sleeve.
    cover_url: r.artworkUrl100?.replace(/\/\d+x\d+bb\./, "/600x600bb.") ?? null,
    preview_url: r.previewUrl?.startsWith("https://audio-ssl.itunes.apple.com/") ? r.previewUrl : null,
    link: r.trackViewUrl?.replace(/[?&]uo=\d+$/, "") ?? null,
  }));
}

/** Books from Open Library. */
export async function searchBooks(term: string, signal?: AbortSignal): Promise<Found[]> {
  const url = `https://openlibrary.org/search.json?limit=10&fields=key,title,author_name,first_publish_year,cover_i&q=${encodeURIComponent(term)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("search failed");
  const data = (await res.json()) as {
    docs: { key: string; title: string; author_name?: string[]; first_publish_year?: number; cover_i?: number }[];
  };
  return data.docs.map((d) => ({
    id: d.key,
    title: d.title,
    subtitle: join(d.author_name?.slice(0, 2).join(", "), year(d.first_publish_year)),
    cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    link: `https://openlibrary.org${d.key}`,
  }));
}

export function youtubeId(link: string): string | null {
  try {
    const url = new URL(link);
    const host = url.hostname.replace(/^(www|m|music)\./, "");
    const id =
      host === "youtu.be" ? url.pathname.slice(1)
      : host === "youtube.com" ? url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? null
      : null;
    return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Title and thumbnail for a YouTube link, plus a start time if the link has one (?t=92). */
export async function lookupYoutube(link: string): Promise<{ title: string; channel: string; cover_url: string; start: number | null } | null> {
  const id = youtubeId(link);
  if (!id) return null;
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { title: string; author_name: string };
  let start: number | null = null;
  try {
    start = parseTime(new URL(link).searchParams.get("t") ?? "");
  } catch {}
  return { title: data.title, channel: data.author_name, cover_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, start };
}

/** "1:32", "92", "92s" or "1m32s" → seconds. */
export function parseTime(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+s?$/.test(t)) return parseInt(t, 10);
  const hms = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (hms && (hms[1] || hms[2] || hms[3])) return (+(hms[1] ?? 0)) * 3600 + (+(hms[2] ?? 0)) * 60 + +(hms[3] ?? 0);
  const parts = t.split(":").map((p) => (/^\d+$/.test(p) ? parseInt(p, 10) : NaN));
  if (parts.length < 2 || parts.length > 3 || parts.some(Number.isNaN)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function formatTime(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** The YouTube player URL for a scene, cut to its start and end. */
export function sceneEmbed(link: string | null, start: number | null, end: number | null, autoplay = true, muted = false): string | null {
  const id = link ? youtubeId(link) : null;
  if (!id) return null;
  const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
  if (autoplay) params.set("autoplay", "1");
  // Muted, the browser lets it start by itself; it plays quietly like a TV left on in the background.
  if (muted) { params.set("mute", "1"); params.set("controls", "0"); }
  if (start != null) params.set("start", String(start));
  if (end != null) params.set("end", String(end));
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

export type FilmDetails = {
  id: string;
  title: string;
  subtitle: string;
  poster_url: string | null;
  stills: string[];
  trailer: string | null;
  link: string;
};

/** Films and TV from TMDB, through our own server so the token stays private. */
export async function searchFilms(term: string, signal?: AbortSignal): Promise<Found[]> {
  const res = await fetch(`/api/films?q=${encodeURIComponent(term)}`, { signal });
  if (!res.ok) throw new Error("search failed");
  return ((await res.json()) as { results: Found[] }).results;
}

export async function filmDetails(id: string): Promise<FilmDetails> {
  const res = await fetch(`/api/films?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("lookup failed");
  return res.json() as Promise<FilmDetails>;
}
