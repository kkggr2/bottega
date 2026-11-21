import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/** The browser Supabase client. Every read and write goes through row level security. */
export function supabase(): SupabaseClient {
  if (!client) {
    if (!url || !key) throw new Error("Supabase is not configured. See .env.example.");
    client = createClient(url, key, {
      auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce", storageKey: LOGIN_KEY },
    });
    if (typeof window !== "undefined") rehome(client, url);
  }
  return client;
}

/*
 * Moving the database (docs/FRANKFURT_MOVE.md) gives Supabase a new address. Logins are kept under the first
 * project's name so phones still find them, and the first time the app meets the new address it trades the
 * old login for a new one (the copied database knows it), then reloads once. Nobody has to log in again.
 */
const LOGIN_KEY = "sb-binvqbsucgohfcqjzoqp-auth-token";
const HOST_KEY = "bottega.supabase.host";

function rehome(c: SupabaseClient, address: string) {
  try {
    const host = new URL(address).host;
    const before = localStorage.getItem(HOST_KEY);
    if (before === host) return;
    localStorage.setItem(HOST_KEY, host);
    if (!before || !localStorage.getItem(LOGIN_KEY)) return;
    void c.auth.refreshSession().then(({ error }) => { if (!error) window.location.reload(); });
  } catch {
    // Without storage there's nothing to move.
  }
}

/** Turn a Postgres or Supabase error into a sentence a person can act on. */
export function friendlyError(error: unknown, fallback = "Something went wrong. Try again."): string {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  if (/username is taken|duplicate key.*username/i.test(message)) return "That username is taken. Try another.";
  if (/holds 80 pieces/i.test(message)) return "A room holds 80 pieces. Take one down to make space.";
  if (/already have a username/i.test(message)) return "You already have a username.";
  if (/guests can.t|add your email/i.test(message)) return "Add your email first: guests can join, vote and play, but not write to others yet.";
  if (/rate limit/i.test(message)) return "Too many tries. Wait a minute and try again.";
  if (/fetch|network/i.test(message)) return "Can't reach Bottega. Check your connection.";
  // Keep the technical reason visible so a problem can be reported and fixed.
  return message ? `${fallback} (${message.slice(0, 160)})` : fallback;
}
