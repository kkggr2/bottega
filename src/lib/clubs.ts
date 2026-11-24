import { isNativeApp } from "./native";
import { supabase } from "./supabase";

/*
 * Clubs: one invite link per film club, book club or group of friends (bottegarooms.com/join/gray-fox).
 * The database does the checking (supabase/migrations/20261116000000_clubs.sql).
 */

export type ClubPublic = { id: string; slug: string; name: string; emoji: string; host_username: string; members: number };
/** is_host: owner or co-host (runs the club). is_owner: can hand it over or delete it. */
export type MyClub = { id: string; slug: string; name: string; emoji: string; is_host: boolean; members: number; messages: number; is_owner?: boolean };
export type ClubRole = "owner" | "cohost" | "member";
export type RosterRow = {
  user_id: string; username: string; joined_at: string; is_host: boolean;
  relation: "me" | "friends" | "asked" | "asking" | "none"; now_title: string | null;
  /** Missing until supabase/migrations/20261202000000_club_admin.sql has run. */
  role?: ClubRole;
};

/** The owner, until the admin update is in: then it's whatever my_clubs says. */
export const isOwner = (club: MyClub) => club.is_owner ?? club.is_host;
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

// ---------------------------------------------------------------------------
// Hand a club over, delete it, or leave it (supabase/migrations/20261121000000_club_hosts.sql)
// ---------------------------------------------------------------------------

export async function makeHost(clubId: string, userId: string): Promise<string | null> {
  const { error } = await supabase().rpc("make_club_host", { p_club: clubId, p_user: userId });
  return error ? rpcError(error.message) : null;
}

export async function deleteClub(clubId: string): Promise<string | null> {
  const { error } = await supabase().rpc("delete_club", { p_club: clubId });
  return error ? rpcError(error.message) : null;
}

// ---------------------------------------------------------------------------
// Co-hosts, removing and banning (supabase/migrations/20261202000000_club_admin.sql)
// ---------------------------------------------------------------------------

export async function setCohost(clubId: string, userId: string, on: boolean): Promise<string | null> {
  const { error } = await supabase().rpc("set_club_cohost", { p_club: clubId, p_user: userId, p_on: on });
  return error ? rpcError(error.message) : null;
}

export async function removeMember(clubId: string, userId: string, ban: boolean): Promise<string | null> {
  const { error } = await supabase().rpc("remove_club_member", { p_club: clubId, p_user: userId, p_ban: ban });
  return error ? rpcError(error.message) : null;
}

export type Banned = { user_id: string; username: string; created_at: string };
export async function bannedFrom(clubId: string): Promise<Banned[]> {
  const { data } = await supabase().rpc("club_banned", { p_club: clubId });
  return (data ?? []) as Banned[];
}

export async function unban(clubId: string, userId: string): Promise<string | null> {
  const { error } = await supabase().rpc("unban_club_member", { p_club: clubId, p_user: userId });
  return error ? rpcError(error.message) : null;
}

export async function leaveClub(clubId: string, me: string): Promise<string | null> {
  const { data, error } = await supabase().from("club_members").delete().eq("club_id", clubId).eq("user_id", me).select("user_id");
  if (error) return rpcError(error.message);
  return data?.length ? null : "Hand the club to someone else, or delete it, before you leave.";
}

// ---------------------------------------------------------------------------
// Meetings, the club's current book, and muting (supabase/migrations/20261203000000_club_life.sql)
// ---------------------------------------------------------------------------

export type Rsvp = "yes" | "maybe" | "no";
export type Meeting = {
  id: string; starts_at: string; place: string; link: string | null; note: string;
  /** Missing until supabase/migrations/20261207000000_club_tools.sql has run. */
  questions?: string; guide_url?: string | null;
  going: string[]; maybe: number; not_going: number; my_answer: Rsvp | null;
};

export async function nextMeeting(clubId: string): Promise<Meeting | null> {
  const { data } = await supabase().rpc("club_next_meeting", { p_club: clubId });
  return ((data ?? []) as Meeting[])[0] ?? null;
}

export type MeetingDraft = {
  starts_at: string; place: string; link: string | null; note: string; tz: string;
  questions?: string; guide_url?: string | null;
};

export async function saveMeeting(clubId: string, me: string, draft: MeetingDraft, id?: string): Promise<string | null> {
  const sb = supabase();
  const { error } = id
    ? await sb.from("club_meetings").update(draft).eq("id", id)
    : await sb.from("club_meetings").insert({ ...draft, club_id: clubId, created_by: me });
  return error ? "Couldn't save the meeting. Check the links start with https://, and try again." : null;
}

export async function cancelMeeting(id: string): Promise<void> {
  await supabase().from("club_meetings").delete().eq("id", id);
}

export async function answerMeeting(meetingId: string, me: string, answer: Rsvp): Promise<boolean> {
  const { error } = await supabase().from("club_rsvps").upsert(
    { meeting_id: meetingId, user_id: me, answer, updated_at: new Date().toISOString() },
    { onConflict: "meeting_id,user_id" },
  );
  return !error;
}

export type PartWord = "chapter" | "part" | "section" | "episode" | "minute";
export type ReadingKind = "book" | "film";
export type Reading = {
  id: string; kind: ReadingKind; title: string; subtitle: string; cover_url: string | null; link: string | null;
  parts: number; part_word: PartWord; due_on: string | null; started_at: string;
  my_part: number; readers: number; finished: number; notes_ahead: number;
};
export type ClubNote = { id: string; author: string; part: number; body: string; created_at: string };

export async function readingNow(clubId: string): Promise<Reading | null> {
  const { data } = await supabase().rpc("club_reading_now", { p_club: clubId });
  return ((data ?? []) as Reading[])[0] ?? null;
}

export async function startReading(
  clubId: string, me: string, book: { title: string; subtitle?: string; cover_url?: string | null; link?: string | null },
  parts: number, partWord: PartWord, dueOn: string | null, kind: ReadingKind = "book",
): Promise<string | null> {
  const { error } = await supabase().from("club_readings").insert({
    club_id: clubId, started_by: me, title: book.title.slice(0, 160), subtitle: (book.subtitle ?? "").slice(0, 160),
    cover_url: book.cover_url ?? null, link: book.link ?? null, parts, part_word: partWord, due_on: dueOn, kind,
  });
  if (!error) return null;
  return /one_current/.test(error.message) ? "Finish the current one first." : "Couldn't start it. Try again.";
}

export async function updateReading(id: string, patch: { parts?: number; part_word?: PartWord; due_on?: string | null }): Promise<void> {
  await supabase().from("club_readings").update(patch).eq("id", id);
}

export async function finishReading(id: string, shelve: boolean): Promise<string | null> {
  const { error } = await supabase().rpc("finish_club_reading", { p_reading: id, p_shelve: shelve });
  return error ? rpcError(error.message) : null;
}

export async function setProgress(readingId: string, me: string, part: number): Promise<boolean> {
  const { error } = await supabase().from("club_progress").upsert(
    { reading_id: readingId, user_id: me, part, updated_at: new Date().toISOString() },
    { onConflict: "reading_id,user_id" },
  );
  return !error;
}

/** The notes this person may see (the database leaves out anything past where they are). */
export async function readingNotes(readingId: string): Promise<ClubNote[]> {
  const { data } = await supabase().from("club_notes").select("id, author, part, body, created_at")
    .eq("reading_id", readingId).order("part").order("created_at");
  return (data ?? []) as ClubNote[];
}

export async function addNote(readingId: string, me: string, part: number, body: string): Promise<string | null> {
  const { error } = await supabase().from("club_notes").insert({ reading_id: readingId, author: me, part, body: body.trim() });
  if (!error) return null;
  return /kind|Slow down/.test(error.message) ? rpcError(error.message) : "Couldn't post it. Try again.";
}

export async function removeNote(id: string): Promise<void> {
  await supabase().from("club_notes").delete().eq("id", id);
}

export async function clubMuted(clubId: string): Promise<boolean> {
  const { data } = await supabase().rpc("club_muted", { p_club: clubId });
  return Boolean(data);
}

export async function setClubMuted(clubId: string, on: boolean): Promise<void> {
  await supabase().rpc("set_club_muted", { p_club: clubId, p_on: on });
}

// ---------------------------------------------------------------------------
// The host's pinned note (supabase/migrations/20261207000000_club_tools.sql)
// ---------------------------------------------------------------------------

export type Pinned = { note: string; pinned_at: string; by_username: string | null };

export async function clubPinned(clubId: string): Promise<Pinned | null> {
  const { data } = await supabase().rpc("club_pinned", { p_club: clubId });
  return ((data ?? []) as Pinned[])[0] ?? null;
}

/** An empty note takes it down. Returns an error to show, or null. */
export async function setClubPin(clubId: string, note: string): Promise<string | null> {
  const { error } = await supabase().rpc("set_club_pin", { p_club: clubId, p_note: note });
  return error ? rpcError(error.message) : null;
}

// ---------------------------------------------------------------------------
// Film night ratings (supabase/migrations/20261208000000_film_night.sql)
// ---------------------------------------------------------------------------

export const rateUrl = (slug: string) => `${SITE}/rate/${slug}`;

export type RatingOpen = {
  club_id: string; club_name: string; emoji: string;
  item_id: string | null; title: string | null; subtitle: string | null; cover_url: string | null;
  is_member: boolean; ratings: number | null; average: number | null; my_stars: number | null; my_comment: string | null;
};
export type RatingLine = { username: string; stars: number; comment: string; at: string };
export type Score = { item_id: string; title: string; subtitle: string; cover_url: string | null; average: number; ratings: number; my_stars: number | null };

/** What's open for rating in a club (null if there's no such club). */
export async function ratingOpen(slug: string): Promise<RatingOpen | null> {
  const { data } = await supabase().rpc("club_rating_open", { p_slug: slug });
  return ((data ?? []) as RatingOpen[])[0] ?? null;
}

export async function rateFilm(itemId: string, stars: number, comment: string): Promise<string | null> {
  const { error } = await supabase().rpc("rate_club_film", { p_item: itemId, p_stars: stars, p_comment: comment });
  return error ? rpcError(error.message) : null;
}

export async function ratingLines(itemId: string): Promise<RatingLine[]> {
  const { data } = await supabase().rpc("club_rating_lines", { p_item: itemId });
  return (data ?? []) as RatingLine[];
}

export async function clubScores(clubId: string): Promise<Score[]> {
  const { data } = await supabase().rpc("club_scores", { p_club: clubId });
  return (data ?? []) as Score[];
}

/** Open rating for a film on the shelf, or close it (null). */
export async function openRating(clubId: string, itemId: string | null): Promise<string | null> {
  const { error } = await supabase().rpc("open_club_rating", { p_club: clubId, p_item: itemId });
  return error ? rpcError(error.message) : null;
}
