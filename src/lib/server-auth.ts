import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The signed-in person behind a request, from their own sign-in token. */
export async function callerId(db: SupabaseClient, request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data.user?.id ?? null;
}

/**
 * The same, but checks the sign-in token's signature here instead of asking Supabase each time
 * (it falls back to asking when the project signs tokens with a shared secret). For quick, frequent
 * calls like answering a quiz question, where a token that was valid a minute ago is good enough.
 */
export async function callerIdQuick(db: SupabaseClient, request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!token) return null;
  const { data, error } = await db.auth.getClaims(token);
  const sub = data?.claims?.sub;
  return !error && typeof sub === "string" ? sub : null;
}
