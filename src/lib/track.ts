import { isConfigured, supabase } from "./supabase";

/*
 * A tiny event log for the growth numbers in docs/STRATEGY.md.
 * Events carry a random id kept on this device, the signed-in person (if any) and the room.
 * No names, emails or page contents. Failures are ignored: tracking never gets in the way.
 */

export type EventName =
  | "open" | "landing" | "example" | "room_view" | "make_yours"
  | "account_created" | "room_claimed" | "piece_added" | "import"
  | "share_link" | "share_picture" | "friend_request" | "made_public" | "now_set";

const VISITOR_KEY = "bottega.visitor";
let memoryVisitor: string | null = null;

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return (memoryVisitor ??= crypto.randomUUID());
  }
}

export function track(name: EventName, opts: { room?: string | null; detail?: string } = {}): void {
  if (!isConfigured || typeof window === "undefined") return;
  const sb = supabase();
  sb.auth
    .getSession()
    .then(({ data }) =>
      sb.from("events").insert({
        name,
        visitor: visitorId(),
        user_id: data.session?.user.id ?? null,
        room_owner: opts.room ?? null,
        detail: (opts.detail ?? "").slice(0, 40),
      }),
    )
    .then(undefined, () => {});
}

/** Logs "open" at most once a day per person on this device, which is what "came back" is measured by. */
export function trackOpen(userId: string | null): void {
  const key = `bottega.opened.${userId ?? "visitor"}`;
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);
  } catch {
    // Without storage, log it anyway.
  }
  track("open");
}

/* Remember whose room someone came from, so their new room starts with that friend. */

const CAME_FROM_KEY = "bottega.cameFrom";
/** `id` is empty when the room was friends-only and the visitor couldn't see who owns it. */
export type CameFrom = { id: string; username: string };

export function rememberCameFrom(owner: CameFrom): void {
  try {
    localStorage.setItem(CAME_FROM_KEY, JSON.stringify({ ...owner, at: Date.now() }));
  } catch {}
}

export function cameFrom(): CameFrom | null {
  try {
    const raw = localStorage.getItem(CAME_FROM_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as CameFrom & { at: number };
    // Forget it after two weeks.
    if (!v.username || Date.now() - v.at > 14 * 864e5) return null;
    return { id: v.id ?? "", username: v.username };
  } catch {
    return null;
  }
}

export function forgetCameFrom(): void {
  try {
    localStorage.removeItem(CAME_FROM_KEY);
  } catch {}
}
