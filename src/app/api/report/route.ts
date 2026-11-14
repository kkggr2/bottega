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

  const body = (await request.json().catch(() => ({}))) as {
    ownerId?: string; reason?: string; messageKind?: "chat" | "dm"; messageId?: string;
  };
  const reason = (body.reason ?? "").trim().slice(0, 500);
  const uuid = /^[0-9a-f-]{36}$/;

  // A single message: look it up here, so the report holds its text even after it's gone.
  let message: { kind: "chat" | "dm"; id: string; body: string; where: string } | null = null;
  if (body.messageKind && body.messageId && uuid.test(body.messageId)) {
    if (body.messageKind === "chat") {
      const { data } = await db.from("chat_messages").select("author, body, room_key").eq("id", body.messageId).maybeSingle();
      if (data) { body.ownerId = data.author as string; message = { kind: "chat", id: body.messageId, body: data.body as string, where: `chat room ${data.room_key}` }; }
    } else {
      const { data } = await db.from("direct_messages").select("sender, recipient, body").eq("id", body.messageId).maybeSingle();
      // Only the person it was sent to can report a private message.
      if (data && data.recipient === reporter) { body.ownerId = data.sender as string; message = { kind: "dm", id: body.messageId, body: data.body as string, where: "a private message" }; }
    }
    if (!message) return Response.json({ error: "That message is gone." }, { status: 404 });
  }

  if (!body.ownerId || !uuid.test(body.ownerId) || !reason) {
    return Response.json({ error: "Say what's wrong in a few words." }, { status: 400 });
  }

  // At most 10 reports a day from one person.
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await db.from("reports").select("id", { count: "exact", head: true }).eq("reporter", reporter).gte("created_at", since);
  if ((count ?? 0) >= 10) return Response.json({ error: "Thanks. We already have your reports." }, { status: 429 });

  const { error } = await db.from("reports").insert({
    reporter, owner_id: body.ownerId, reason,
    ...(message ? { message_kind: message.kind, message_id: message.id, message_body: message.body } : {}),
  });
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
        subject: message ? `Report: a message by @${owner?.username ?? body.ownerId}` : `Report: @${owner?.username ?? body.ownerId}'s room`,
        text: [
          message
            ? `@${who?.username ?? reporter} reported a message by @${owner?.username ?? body.ownerId} in ${message.where}:\n\n"${message.body}"`
            : `@${who?.username ?? reporter} reported @${owner?.username ?? body.ownerId}'s room.`,
          "",
          `Reason: ${reason}`,
          "",
          `Room: https://bottegarooms.com/r/${owner?.username ?? ""}`,
          message
            ? `Look at it within 24 hours. To remove it: Supabase → Table Editor → ${message.kind === "chat" ? "chat_messages" : "direct_messages"} → id ${message.id}. To remove the person, delete their account.`
            : "Look at it within 24 hours. To remove content, delete the pieces or the account in Supabase.",
        ].join("\n"),
      }),
    }).catch(() => {});
  }
  return Response.json({ reported: true });
}
