export type Embed = { provider: string; src: string; height: number };

/** Turn a pasted music or video link into an embeddable player, when the service allows it. */
export function toEmbed(link: string | null | undefined): Embed | null {
  if (!link) return null;
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");

  if (host === "open.spotify.com") {
    const m = url.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
    if (m) return { provider: "Spotify", src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: m[1] === "track" ? 152 : 352 };
  }
  if (host === "youtube.com" || host === "music.youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    const id = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
    if (id && /^[A-Za-z0-9_-]{6,20}$/.test(id)) return { provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}`, height: 0 };
  }
  if (host === "music.apple.com") {
    return { provider: "Apple Music", src: `https://embed.music.apple.com${url.pathname}${url.search}`, height: url.searchParams.has("i") ? 175 : 450 };
  }
  if (host === "soundcloud.com") {
    return { provider: "SoundCloud", src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(link)}&visual=false`, height: 166 };
  }
  return null;
}

export function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}
