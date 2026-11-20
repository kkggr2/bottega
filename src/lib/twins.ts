import { supabase } from "./supabase";
import { tasteMatch, type MatchItem, type TasteMatch } from "./taste";

/* Taste Twins: supabase/migrations/20261123000000_taste_twins.sql. Matching runs on the phone with taste.ts. */

export type Twin = { userId: string; username: string; match: TasteMatch };

export async function isOptedIn(me: string): Promise<boolean> {
  const { data } = await supabase().from("twin_optin").select("user_id").eq("user_id", me).maybeSingle();
  return Boolean(data);
}

export async function setOptIn(me: string, on: boolean): Promise<string | null> {
  const sb = supabase();
  const { error } = on
    ? await sb.from("twin_optin").insert({ user_id: me })
    : await sb.from("twin_optin").delete().eq("user_id", me);
  if (error && !/duplicate/i.test(error.message)) return /row-level/i.test(error.message) ? "Add your email first: guests can't look for taste twins yet." : "Couldn't save that. Try again.";
  return null;
}

/** Your closest twins among everyone who opted in, best first. */
export async function findTwins(mine: MatchItem[], limit = 5): Promise<Twin[]> {
  const { data } = await supabase().rpc("twin_candidates");
  const people = (data ?? []) as { user_id: string; username: string; pieces: MatchItem[] }[];
  return people
    .map((p) => ({ userId: p.user_id, username: p.username, match: tasteMatch(mine, p.pieces) }))
    .filter((t): t is Twin => Boolean(t.match && t.match.percent >= 40))
    .sort((a, b) => b.match.percent - a.match.percent || b.match.both.length - a.match.both.length)
    .slice(0, limit);
}
