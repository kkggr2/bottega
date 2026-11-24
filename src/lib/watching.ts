import { supabase } from "./supabase";

/** What someone is watching in Margins right now (the last 2 hours), for the TV in their room. Never a comment or a minute. */
export type Watching = {
  show_id: number;
  show_name: string | null;
  poster_path: string | null;
  season: number;
  episode: number;
  updated_at: string;
};

export async function watchingNow(username: string): Promise<Watching | null> {
  const { data, error } = await supabase().rpc("watching_now", { p_username: username });
  if (error) return null;
  return ((data as Watching[] | null) ?? [])[0] ?? null;
}

/** "S1 E3" */
export const episodeCode = (w: { season: number; episode: number }) => `S${w.season} E${w.episode}`;

/** The link that opens Margins on this episode (a universal link), or explains Margins on the web. */
export const watchPath = (w: { show_id: number; season: number; episode: number }) => `/watch/${w.show_id}/${w.season}/${w.episode}`;

export const posterUrl = (path: string | null, size = "w342") => (path ? `https://image.tmdb.org/t/p/${size}${path}` : null);

/** Margins on the App Store, once it's there. Until then the /watch page says it's coming. */
export const MARGINS_APP_STORE: string | null = null;
