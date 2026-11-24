import type { NextRequest } from "next/server";
import { renderLetter, sendEmail, type LetterClub } from "@/lib/club-email";
import { renderDigest, unsubscribeUrl, type DigestItem } from "@/lib/digest-email";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * GET /api/digest — run once a day by Vercel Cron (see vercel.json).
 * Emails each person what their friends put on since their last email, only if something changed.
 * On Sundays it also sends the weekly club letter to members without notifications (see clubLetters below).
 * Vercel sends "Authorization: Bearer $CRON_SECRET"; anything else is turned away.
 */

const FROM = "Bottega <hello@bottegarooms.com>";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Not allowed", { status: 401 });
  }
  const db = supabaseAdmin();
  const resendKey = process.env.RESEND_API_KEY;
  if (!db || !resendKey) {
    return Response.json({ error: "Missing SUPABASE_SECRET_KEY or RESEND_API_KEY" }, { status: 500 });
  }

  const { data, error } = await db.rpc("digest_batch");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const batch = (data ?? []) as { user_id: string; email: string; username: string; items: DigestItem[] }[];

  const sent: string[] = [];
  const failed: string[] = [];
  for (const person of batch) {
    const { subject, html, text } = renderDigest(person.user_id, person.items);
    const unsub = unsubscribeUrl(person.user_id);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: person.email,
        subject,
        html,
        text,
        headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      }),
    });
    (res.ok ? sent : failed).push(person.user_id);
  }

  if (sent.length) {
    const { error: markError } = await db.rpc("mark_digest_sent", { p_users: sent });
    if (markError) return Response.json({ sent: sent.length, failed: failed.length, error: markError.message }, { status: 500 });
  }
  const letters = new Date().getUTCDay() === 0 ? await clubLetters(db) : null;
  return Response.json({ people: batch.length, sent: sent.length, failed: failed.length, letters });
}

/**
 * The weekly club letter: for members with notifications off, what's on in each of their clubs
 * (the host's note, the next meeting, the book or film, how many new messages). Only when there is something.
 */
async function clubLetters(db: NonNullable<ReturnType<typeof supabaseAdmin>>) {
  const { data, error } = await db.rpc("club_letter_batch");
  if (error) return { error: error.message };
  const sent: string[] = [];
  for (const p of (data ?? []) as { user_id: string; email: string; clubs: LetterClub[] }[]) {
    if (p.clubs?.length && await sendEmail(p.email, p.user_id, renderLetter(p.user_id, p.clubs))) sent.push(p.user_id);
  }
  if (sent.length) await db.rpc("mark_club_letter_sent", { p_users: sent });
  return { sent: sent.length };
}
