import { callerIdQuick } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TmdbMissingToken, tmdb, yearOf } from "@/lib/tmdb";

/*
 * TV lookups for Margins (Bottega's watch-along app). The TMDB token stays on the server.
 * POST /api/tv with the person's sign-in token as "Authorization: Bearer …" and one of:
 *   { action: "search", query: "severance" }     → shows
 *   { action: "show", showId: 95396 }             → one show
 *   { action: "seasons", showId: 95396 }          → seasons (also saves the show's name for rooms)
 *   { action: "episodes", showId: 95396, season: 1 } → episodes, without overviews (they spoil)
 */

type Body = { action?: string; query?: string; showId?: number; season?: number };

export async function POST(request: Request) {
  const db = supabaseAdmin();
  if (!db) return Response.json({ error: "Not set up" }, { status: 500 });
  if (!(await callerIdQuick(db, request))) return Response.json({ error: "Sign in first" }, { status: 401 });

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "search": {
        const q = (body.query ?? "").trim().slice(0, 100);
        if (!q) return Response.json([]);
        const r = await tmdb<{ results?: { id: number; name: string; poster_path?: string | null; first_air_date?: string; overview?: string }[] }>(
          `/search/tv?include_adult=false&query=${encodeURIComponent(q)}`,
        );
        return Response.json(
          (r.results ?? []).slice(0, 20).map((s) => ({
            id: s.id,
            name: s.name,
            poster_path: s.poster_path ?? null,
            year: yearOf(s.first_air_date) || null,
            overview: s.overview ?? null,
          })),
        );
      }
      case "show": {
        // One show, for "Watch along" links. Overview left out: links skip the show page.
        const id = Number(body.showId);
        if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Unknown show" }, { status: 400 });
        const r = await tmdb<{ id: number; name: string; poster_path?: string | null; first_air_date?: string }>(`/tv/${id}`);
        await remember(db, id, r.name, r.poster_path);
        return Response.json({ id: r.id, name: r.name, poster_path: r.poster_path ?? null, year: yearOf(r.first_air_date) || null, overview: null });
      }
      case "seasons": {
        const id = Number(body.showId);
        if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Unknown show" }, { status: 400 });
        const r = await tmdb<{ name: string; poster_path?: string | null; seasons?: { season_number: number; name: string; episode_count: number }[] }>(
          `/tv/${id}`,
        );
        await remember(db, id, r.name, r.poster_path);
        return Response.json(
          (r.seasons ?? [])
            .filter((s) => s.season_number > 0 && s.episode_count > 0)
            .map((s) => ({ number: s.season_number, name: s.name, episode_count: s.episode_count })),
        );
      }
      case "episodes": {
        const id = Number(body.showId), season = Number(body.season);
        if (!Number.isInteger(id) || !Number.isInteger(season)) return Response.json({ error: "Unknown episode" }, { status: 400 });
        const r = await tmdb<{ episodes?: { season_number: number; episode_number: number; name: string; runtime?: number | null }[] }>(
          `/tv/${id}/season/${season}`,
        );
        return Response.json(
          (r.episodes ?? []).map((e) => ({
            season: e.season_number,
            number: e.episode_number,
            name: e.name,
            runtime_minutes: e.runtime ?? null,
          })),
        );
      }
      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const missing = error instanceof TmdbMissingToken;
    return Response.json({ error: missing ? "TV search isn't set up yet." : "TV search is unavailable right now." }, { status: missing ? 501 : 502 });
  }
}

/** Remember a show's name and poster, so a room can say "Watching Severance" without asking TMDB. */
async function remember(db: NonNullable<ReturnType<typeof supabaseAdmin>>, id: number, name: string, poster?: string | null) {
  await db.schema("margins").from("shows").upsert({
    id,
    name: name.slice(0, 200),
    poster_path: poster && /^\/[A-Za-z0-9._-]+$/.test(poster) ? poster : null,
    updated_at: new Date().toISOString(),
  });
}
