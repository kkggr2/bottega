import "server-only";
import { meetingWhen } from "./club-time";
import { unsubscribeUrl } from "./digest-email";

/*
 * Club news by email, for members who don't have notifications on (no app, no browser push):
 *   the meeting reminder the day before, and a short weekly letter when something is happening.
 * Same look as the daily email. Every one carries a one-click "stop club emails".
 */

const SITE = "https://bottegarooms.com";
const FROM = "Bottega <hello@bottegarooms.com>";
const C = { paper: "#F2E8D3", card: "#FAF4E6", ink: "#2F2822", muted: "#6B5F52", line: "#DCCDB0", rust: "#B3552E" };
const SANS = "-apple-system,Segoe UI,Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const clubUrl = (slug: string) => `${SITE}/club/${encodeURIComponent(slug)}`;

export type Email = { subject: string; html: string; text: string };

/** Sends one email through Resend. True if it went. */
export async function sendEmail(to: string, userId: string, email: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const unsub = unsubscribeUrl(userId, "club");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM, to, subject: email.subject, html: email.html, text: email.text,
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  }).catch(() => null);
  return Boolean(res?.ok);
}

/** Bottega's letter paper: a heading, a card of rows, and the footer. */
function page(userId: string, heading: string, rows: string[], footer: string): string {
  const unsub = unsubscribeUrl(userId, "club");
  const body = rows.map((r) => `<tr><td style="padding:14px 18px;border-top:1px solid ${C.line};font:16px/1.45 ${SERIF};color:${C.ink}">${r}</td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;background:${C.paper}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td style="padding:0 6px 14px;font:28px/1 ${SERIF};color:${C.ink}">Bottega</td></tr>
        <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:14px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:18px 18px 12px;font:15px/1.5 ${SANS};color:${C.muted}">${esc(heading)}</td></tr>
            ${body}
          </table>
        </td></tr>
        <tr><td style="padding:16px 6px;font:12.5px/1.6 ${SANS};color:${C.muted}">
          ${esc(footer)} <a href="${unsub}" style="color:${C.muted}">Stop club emails</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

const small = (s: string) => `<br><span style="font:14px/1.6 ${SANS};color:${C.muted}">${s}</span>`;
const go = (href: string, label: string) =>
  `<br><a href="${href}" style="font:14px/1.6 ${SANS};color:${C.rust};text-decoration:none">${esc(label)} &rarr;</a>`;

// ---------------------------------------------------------------------------
// The day before a meeting
// ---------------------------------------------------------------------------

export type ReminderMeeting = { slug: string; club_name: string; starts_at: string; place: string; tz: string };

export function renderReminder(userId: string, m: ReminderMeeting): Email {
  const when = meetingWhen(m.starts_at, m.tz);
  const subject = `${m.club_name}: ${when}`;
  const row = `<b>${esc(when)}</b>${m.place ? small(esc(m.place)) : ""}${go(clubUrl(m.slug), "Say if you're coming")}`;
  const footer = "You get this by email because Bottega notifications aren't on for you.";
  return {
    subject,
    html: page(userId, `${m.club_name} meets tomorrow`, [row], footer),
    text: [`${m.club_name} meets tomorrow`, "", when, ...(m.place ? [m.place] : []), "", `Say if you're coming: ${clubUrl(m.slug)}`, "", footer,
      `Stop club emails: ${unsubscribeUrl(userId, "club")}`].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// The weekly letter
// ---------------------------------------------------------------------------

export type LetterClub = {
  name: string; slug: string;
  meeting: { starts_at: string; tz: string; place: string; answer: "yes" | "maybe" | "no" | null } | null;
  reading: { title: string; kind: "book" | "film"; parts: number; part_word: string; my_part: number } | null;
  pin: string | null;
  chat: number;
};

/** The lines for one club, plain text (escaped later for HTML). */
function clubLines(c: LetterClub): string[] {
  const lines: string[] = [];
  if (c.pin) lines.push(`From the host: “${c.pin.length > 220 ? `${c.pin.slice(0, 219)}…` : c.pin}”`);
  if (c.meeting) {
    const answer = c.meeting.answer === "yes" ? " You said you're coming." : c.meeting.answer === "maybe" ? " You said maybe." : c.meeting.answer === "no" ? "" : " Are you coming?";
    lines.push(`Next meeting: ${meetingWhen(c.meeting.starts_at, c.meeting.tz)}${c.meeting.place ? ` · ${c.meeting.place}` : ""}.${answer}`);
  }
  if (c.reading) {
    const r = c.reading;
    const where = r.kind === "film"
      ? (r.my_part > 0 ? ` You're ${r.my_part} minutes in.` : "")
      : (r.my_part >= r.parts ? " You've finished it." : r.my_part > 0 ? ` You're at ${r.part_word} ${r.my_part} of ${r.parts}.` : "");
    lines.push(`${r.kind === "film" ? "Now watching" : "Now reading"}: ${r.title}.${where}`);
  }
  if (c.chat > 0) lines.push(c.chat === 1 ? "1 new message in the chat this week." : `${c.chat} new messages in the chat this week.`);
  return lines;
}

export function renderLetter(userId: string, clubs: LetterClub[]): Email {
  const subject = clubs.length === 1 ? `This week in ${clubs[0].name}` : `This week in ${clubs[0].name} and ${clubs.length - 1} more`;
  const rows = clubs.map((c) =>
    `<b>${esc(c.name)}</b>${clubLines(c).map((l) => small(esc(l))).join("")}${go(clubUrl(c.slug), "Open the club")}`);
  const footer = "Once a week, only when something's happening in your clubs, because notifications are off for you.";
  const text = [
    "This week in your clubs",
    "",
    ...clubs.flatMap((c) => [c.name, ...clubLines(c), clubUrl(c.slug), ""]),
    footer,
    `Stop club emails: ${unsubscribeUrl(userId, "club")}`,
  ].join("\n");
  return { subject, html: page(userId, "This week in your clubs", rows, footer), text };
}
