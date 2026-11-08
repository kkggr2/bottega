import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The signed-in person behind a request, from their own sign-in token. */
export async function callerId(db: SupabaseClient, request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data.user?.id ?? null;
}
