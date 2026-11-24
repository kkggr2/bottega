import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { tmdb } from "@/lib/tmdb";
import { MARGINS_APP_STORE, posterUrl } from "@/lib/watching";

/*
 * bottegarooms.com/watch/{tmdbShowId}/{season}/{episode}: "Watch along" from a friend's room.
 * With Margins on the iPhone, this link opens the app on that episode (see .well-known/apple-app-site-association).
 * Without it, this page says what Margins is. No episode summaries: they spoil.
 */

type Params = { show: string; season: string; episode: string };

async function episodeInfo(p: Params) {
  "use cache";
  cacheLife("days"); // Show names and posters rarely change.
  const id = Number(p.show), season = Number(p.season), episode = Number(p.episode);
  if (![id, season, episode].every((n) => Number.isInteger(n) && n >= 0) || id <= 0 || episode < 1) return null;
  try {
    const show = await tmdb<{ name: string; poster_path?: string | null }>(`/tv/${id}`);
    const ep = await tmdb<{ name?: string }>(`/tv/${id}/season/${season}/episode/${episode}`).catch(() => null);
    return { name: show.name, poster: posterUrl(show.poster_path ?? null, "w500"), season, episode, title: ep?.name ?? null };
  } catch {
    return { name: null, poster: null, season, episode, title: null };
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const info = await episodeInfo(await params);
  const what = info?.name ? `${info.name} · S${info.season} E${info.episode}` : "an episode";
  return { title: `Watch along: ${what}`, description: `Watch ${what} together on Margins, Bottega's watch-along app.` };
}

// The words load in their own boundary, so the page shell shows at once.
export default function WatchPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<article className="legal watch-page"><p className="smallcaps">Watch along</p></article>}>
      <WatchBody params={params} />
    </Suspense>
  );
}

async function WatchBody({ params }: { params: Promise<Params> }) {
  const info = await episodeInfo(await params);
  return (
    <article className="legal watch-page">
      <p className="smallcaps">Watch along</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- TMDB poster */}
      {info?.poster && <img className="watch-poster" src={info.poster} alt="" />}
      <h1>{info?.name ?? "This episode"}</h1>
      {info && <p className="muted">S{info.season} E{info.episode}{info.title ? ` · ${info.title}` : ""}</p>}

      <p>
        <b>Margins</b> is Bottega&rsquo;s watch-along app. Press play on your TV and tap Sync: comments from
        friends and other viewers appear at the exact second they were written, and nothing past where you are
        is ever shown.
      </p>
      {MARGINS_APP_STORE ? (
        <p><a className="btn" href={MARGINS_APP_STORE}>Get Margins on the App Store</a></p>
      ) : (
        <p className="muted">Margins is coming to the App Store soon. With it on your iPhone, this link opens the episode straight away.</p>
      )}

      <p className="legal-links"><Link href="/">Bottega</Link> · <Link href="/privacy">Privacy</Link></p>
    </article>
  );
}
