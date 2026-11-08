import { callerId } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * POST /api/report — someone reports a room. Saved, and emailed to hello@bottegarooms.com at once,
 * so it can be looked at within a day (Apple asks for that).
 */

const TO = "hello@bottegarooms.com";

export async function POST(request: Request) {
  const db = supabaseAdmin();
  if (!db) return Response.json({ error: "Not set up" }, { status: 500 });
  const reporter = await callerId(db, request);
  if (!reporter) return Response.json({ error: "Sign in first" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { ownerId?: string; reason?: string };
  const reason = (body.reason ?? "").trim().slice(0, 500);
  if (!body.ownerId || !/^[0-9a-f-]{36}$/.test(body.ownerId) || !reason) {
    return Response.json({ error: "Say what's wrong in a few words." }, { status: 400 });
  }

  // At most 10 reports a day from one person.
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await db.from("reports").select("id", { count: "exact", head: true }).eq("reporter", reporter).gte("created_at", since);
  if ((count ?? 0) >= 10) return Response.json({ error: "Thanks. We already have your reports." }, { status: 429 });

  const { error } = await db.from("reports").insert({ reporter, owner_id: body.ownerId, reason });
  if (error) return Response.json({ error: "Couldn't send the report. Try again." }, { status: 500 });

  const [{ data: owner }, { data: who }] = await Promise.all([
    db.from("profiles").select("username").eq("id", body.ownerId).maybeSingle(),
    db.from("profiles").select("username").eq("id", reporter).maybeSingle(),
  ]);
  const key = process.env.RESEND_API_KEY;
  if (key) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Bottega <hello@bottegarooms.com>",
        to: TO,
        subject: `Report: @${owner?.username ?? body.ownerId}'s room`,
        text: [
          `@${who?.username ?? reporter} reported @${owner?.username ?? body.ownerId}'s room.`,
          "",
          `Reason: ${reason}`,
          "",
          `Room: https://bottegarooms.com/r/${owner?.username ?? ""}`,
          "Look at it within 24 hours. To remove content, delete the pieces or the account in Supabase.",
        ].join("\n"),
      }),
    }).catch(() => {});
  }
  return Response.json({ reported: true });
}
