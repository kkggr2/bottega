import { isNativeApp } from "./native";
import { supabase } from "./supabase";

/*
 * Clubs: one invite link per film club, book club or group of friends (bottegarooms.com/join/gray-fox).
 * The database does the checking (supabase/migrations/20261116000000_clubs.sql).
 */

export type ClubPublic = { id: string; slug: string; name: string; emoji: string; host_username: string; members: number };
export type MyClub = { id: string; slug: string; name: string; emoji: string; is_host: boolean; members: number; messages: number };
export type RosterRow = {
  user_id: string; username: string; joined_at: string; is_host: boolean;
  relation: "me" | "friends" | "asked" | "asking" | "none"; now_title: string | null;
};
export type ClubStats = { members: number; joined_7d: number; came_back: number; active_7d: number };

export const SITE = "https://bottegarooms.com";
export const APP_STORE = "https://apps.apple.com/app/id6832240962";
export const joinUrl = (slug: string) => `${SITE}/join/${slug}`;

export async function clubPublic(slug: string): Promise<ClubPublic | null> {
  const { data } = await supabase().rpc("club_public", { p_slug: slug });
  return ((data ?? []) as ClubPublic[])[0] ?? null;
}

export async function myClubs(): Promise<MyClub[]> {
  const { data } = await supabase().rpc("my_clubs");
  return (data ?? []) as MyClub[];
}

export async function roster(clubId: string): Promise<RosterRow[]> {
  const { data } = await supabase().rpc("club_roster", { p_club: clubId });
  return (data ?? []) as RosterRow[];
}

export async function clubStats(clubId: string): Promise<ClubStats | null> {
  const { data } = await supabase().rpc("club_stats", { p_club: clubId });
  return ((data ?? []) as ClubStats[])[0] ?? null;
}

/** Returns an error to show, or null. */
export async function joinClub(slug: string, source = "link"): Promise<string | null> {
  const { error } = await supabase().rpc("join_club", { p_slug: slug, p_source: source });
  return error ? error.message.replace(/^.*?:\s*/, "") : null;
}

export async function createClub(slug: string, name: string, emoji: string): Promise<string | null> {
  const { error } = await supabase().rpc("create_club", { p_slug: slug, p_name: name, p_emoji: emoji });
  if (!error) return null;
  if (/taken|up to 5|keep it kind/i.test(error.message)) return error.message.replace(/^.*?(That link|You can host|Keep it kind)/i, "$1");
  if (/check constraint/i.test(error.message)) return "Use 3–40 lowercase letters, numbers or dashes for the link, and a name of 2–60 characters.";
  return "Couldn't start the club. Try again.";
}

/** "Gray Fox Book Club!" → "gray-fox-book-club" */
export function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

// The club someone was on its way into before signing up. Kept on this device for a week.
const PENDING = "bottega.joinClub";
export function rememberClub(slug: string): void {
  try { localStorage.setItem(PENDING, JSON.stringify({ slug, at: Date.now() })); } catch {}
}
export function pendingClub(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(PENDING) ?? "null") as { slug: string; at: number } | null;
    return v && Date.now() - v.at < 7 * 864e5 ? v.slug : null;
  } catch { return null; }
}
export function forgetClub(): void {
  try { localStorage.removeItem(PENDING); } catch {}
}

/**
 * In a browser (not the app): tell the server this network was just invited, so that if the person installs
 * the app and signs up there within the hour, the invite still reaches them.
 */
export function rememberInvite(invite: { club?: string; inviter?: string }): void {
  if (typeof window === "undefined" || isNativeApp()) return;
  void fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remember", ...invite }) }).catch(() => {});
}

/** Right after signing up in the app: was this network invited in the last hour? */
export async function claimInvite(): Promise<{ club: string | null; inviter: string | null }> {
  const none = { club: null, inviter: null };
  if (!isNativeApp()) return none;
  const { data } = await supabase().auth.getSession();
  if (!data.session) return none;
  const res = await fetch("/api/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ action: "claim" }),
  }).catch(() => null);
  return res?.ok ? ((await res.json()) as { club: string | null; inviter: string | null }) : none;
}

// ---------------------------------------------------------------------------
// The club's shelf and "What's next?" (supabase/migrations/20261119000000_club_shelf.sql)
// ---------------------------------------------------------------------------

export type ShelfKind = "film" | "book" | "song";
export type ShelfItem = {
  id: string; type: ShelfKind; title: string; subtitle: string; cover_url: string | null; link: string | null; note: string; created_at: string;
};
export type PollOption = { type: ShelfKind; title: string; subtitle?: string; cover_url?: string | null; link?: string | null };
export type PollState = {
  id: string; question: string; options: PollOption[]; closed_at: string | null; winner: number | null;
  counts: number[]; my_choice: number | null; voters: number;
};

export async function shelfOf(clubId: string): Promise<ShelfItem[]> {
  const { data } = await supabase().from("club_shelf").select("*").eq("club_id", clubId).order("created_at", { ascending: false });
  return (data ?? []) as ShelfItem[];
}

export async function shelfPreview(slug: string): Promise<Pick<ShelfItem, "type" | "title" | "subtitle" | "cover_url">[]> {
  const { data } = await supabase().rpc("club_shelf_preview", { p_slug: slug, p_limit: 8 });
  return (data ?? []) as Pick<ShelfItem, "type" | "title" | "subtitle" | "cover_url">[];
}

export async function addToShelf(clubId: string, me: string, item: PollOption): Promise<string | null> {
  const { error } = await supabase().from("club_shelf").insert({
    club_id: clubId, added_by: me, type: item.type, title: item.title.slice(0, 120), subtitle: (item.subtitle ?? "").slice(0, 120),
    cover_url: item.cover_url ?? null, link: item.link ?? null,
  });
  return error ? (/full|kind/i.test(error.message) ? error.message : "Couldn't add it. Try again.") : null;
}

export async function removeFromShelf(id: string): Promise<void> {
  await supabase().from("club_shelf").delete().eq("id", id);
}

export async function pollState(clubId: string): Promise<PollState | null> {
  const { data } = await supabase().rpc("club_poll_state", { p_club: clubId });
  return ((data ?? []) as PollState[])[0] ?? null;
}

const rpcError = (message: string) => message.replace(/^.*?:\s*/, "");

export async function openPoll(clubId: string, options: PollOption[], question: string): Promise<string | null> {
  const { error } = await supabase().rpc("open_club_poll", { p_club: clubId, p_options: options, p_question: question });
  return error ? rpcError(error.message) : null;
}

export async function votePoll(pollId: string, choice: number): Promise<string | null> {
  const { error } = await supabase().rpc("vote_club_poll", { p_poll: pollId, p_choice: choice });
  return error ? rpcError(error.message) : null;
}

export async function closePoll(pollId: string, shelve: boolean): Promise<string | null> {
  const { error } = await supabase().rpc("close_club_poll", { p_poll: pollId, p_shelve: shelve });
  return error ? rpcError(error.message) : null;
}

// Someone on their way to starting a club (bottegarooms.com/start), kept for a day across sign-up.
const START = "bottega.startClub";
export function rememberStartClub(): void {
  try { localStorage.setItem(START, String(Date.now())); } catch {}
}
export function pendingStartClub(): boolean {
  try { return Date.now() - Number(localStorage.getItem(START) ?? 0) < 864e5; } catch { return false; }
}
export function forgetStartClub(): void {
  try { localStorage.removeItem(START); } catch {}
}
