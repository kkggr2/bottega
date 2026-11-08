import { callerId } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * POST /api/account/delete — deletes the caller's account for good.
 * Removes their uploaded files, unlinks their growth events, then deletes the sign-in,
 * which removes the profile, room, pieces, friendships, blocks and settings with it.
 */
export async function POST(request: Request) {
  const db = supabaseAdmin();
  if (!db) return Response.json({ error: "Not set up" }, { status: 500 });
  const id = await callerId(db, request);
  if (!id) return Response.json({ error: "Sign in first" }, { status: 401 });

  // Uploaded images and clips live under media/<id>/.
  const { data: files } = await db.storage.from("media").list(id, { limit: 1000 });
  if (files?.length) await db.storage.from("media").remove(files.map((f) => `${id}/${f.name}`));

  await db.rpc("forget_user_events", { p_user: id });
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return Response.json({ error: "Couldn't delete the account. Try again." }, { status: 500 });
  return Response.json({ deleted: true });
}
