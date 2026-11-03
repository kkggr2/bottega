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
      auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" },
    });
  }
  return client;
}

/** Turn a Postgres or Supabase error into a sentence a person can act on. */
export function friendlyError(error: unknown, fallback = "Something went wrong. Try again."): string {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  if (/username is taken|duplicate key.*username/i.test(message)) return "That username is taken. Try another.";
  if (/holds 80 pieces/i.test(message)) return "A room holds 80 pieces. Take one down to make space.";
  if (/already have a username/i.test(message)) return "You already have a username.";
  if (/rate limit/i.test(message)) return "Too many tries. Wait a minute and try again.";
  if (/fetch|network/i.test(message)) return "Can't reach Bottega. Check your connection.";
  return fallback;
}
