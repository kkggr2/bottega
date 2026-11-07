import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * A Supabase client with the project's secret key. Server-only: it can read email addresses,
 * so it's used just for the daily email and unsubscribing, never in the browser.
 */
export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
