import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { joinDid, NOW_WORDS } from "./now";
import type { NowSlot } from "./types";

type Slot = NowSlot | "note" | "rec";

/* The daily email: what friends put on, one line each, in Bottega's colors. */

export type DigestItem = { friend: string; slot: Slot; title: string; at: string };

/** "put on Teardrop", "left a note on your wall", "left you Normal People". */
function did(item: DigestItem): string {
  if (item.slot === "note") return "left a note on your wall";
  if (item.slot === "rec") return `left you ${item.title}`;
  return NOW_WORDS[item.slot].did(item.title);
}

const SITE = "https://bottegarooms.com";
const C = { paper: "#F2E8D3", card: "#FAF4E6", ink: "#2F2822", muted: "#6B5F52", line: "#DCCDB0", rust: "#B3552E" };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Signs an unsubscribe link so nobody can turn off someone else's email. */
export function unsubscribeToken(userId: string): string {
  return createHmac("sha256", process.env.CRON_SECRET ?? "").update(`unsubscribe:${userId}`).digest("hex").slice(0, 32);
}

export function validUnsubscribe(userId: string, token: string): boolean {
  if (!process.env.CRON_SECRET || !/^[0-9a-f-]{36}$/.test(userId) || !/^[0-9a-f]{32}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(unsubscribeToken(userId)), Buffer.from(token));
}

export function unsubscribeUrl(userId: string): string {
  return `${SITE}/api/unsubscribe?u=${userId}&t=${unsubscribeToken(userId)}`;
}

/** Groups items by friend, newest friend first, into lines like "@cagla put on Teardrop and left Normal People on the armchair". */
export function linesFor(items: DigestItem[]): { friend: string; line: string }[] {
  const byFriend = new Map<string, DigestItem[]>();
  for (const it of [...items].sort((a, b) => b.at.localeCompare(a.at))) {
    byFriend.set(it.friend, [...(byFriend.get(it.friend) ?? []), it]);
  }
  return [...byFriend].map(([friend, list]) => ({ friend, line: joinDid(list.map(did)) }));
}

export function subjectFor(lines: { friend: string; line: string }[]): string {
  const first = lines[0];
  if (lines.length === 1) {
    const s = `@${first.friend} ${first.line}`;
    return s.length > 78 ? `@${first.friend} put something on in their room` : s;
  }
  const others = lines.length - 1;
  return `New from @${first.friend} and ${others} ${others === 1 ? "friend" : "friends"}`;
}

export function renderDigest(userId: string, items: DigestItem[]): { subject: string; html: string; text: string } {
  const lines = linesFor(items);
  const subject = subjectFor(lines);
  const unsub = unsubscribeUrl(userId);
  const rows = lines.map(({ friend, line }) => `
        <tr><td style="padding:14px 18px;border-top:1px solid ${C.line};font:16px/1.45 Georgia,'Times New Roman',serif;color:${C.ink}">
          <b>@${esc(friend)}</b> ${esc(line)}<br>
          <a href="${SITE}/r/${encodeURIComponent(friend)}" style="font:14px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${C.rust};text-decoration:none">Step into their room &rarr;</a>
        </td></tr>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:${C.paper}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td style="padding:0 6px 14px;font:28px/1 Georgia,'Times New Roman',serif;color:${C.ink}">Bottega</td></tr>
        <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:14px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:18px 18px 12px;font:15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${C.muted}">New on your shelf today</td></tr>
            ${rows}
          </table>
        </td></tr>
        <tr><td style="padding:16px 6px;font:12.5px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${C.muted}">
          You get this only on days a friend puts something on.
          <a href="${unsub}" style="color:${C.muted}">Stop these emails</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
  const text = [
    "New on your shelf today",
    "",
    ...lines.map(({ friend, line }) => `@${friend} ${line}\n${SITE}/r/${friend}\n`),
    "You get this only on days a friend puts something on.",
    `Stop these emails: ${unsub}`,
  ].join("\n");
  return { subject, html, text };
}
