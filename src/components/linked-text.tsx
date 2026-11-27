"use client";

import type { ReactNode } from "react";

/*
 * Links people write in messages (a YouTube video, an article, a Zoom call) open with a tap.
 * Only web links (https://…, http://…, www.…) become links; everything else stays plain text.
 */

const LINK = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;

/** "Look at this (https://youtu.be/x)." → the link without the brackets and full stop around it. */
function trimEnd(raw: string): string {
  let url = raw;
  for (;;) {
    const last = url.at(-1);
    if (!last) return url;
    if (".,!?;:'\"]}".includes(last)) { url = url.slice(0, -1); continue; }
    // Keep a closing bracket that belongs to the link, as in …/wiki/Stalker_(1979_film).
    if (last === ")" && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) { url = url.slice(0, -1); continue; }
    return url;
  }
}

/** Shown without https:// and www., and cut short when very long; the link itself stays whole. */
function shortLabel(url: string): string {
  const s = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

export function LinkedText({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(LINK)) {
    const raw = trimEnd(m[0]);
    const href = /^www\./i.test(raw) ? `https://${raw}` : raw;
    let ok = false;
    try { ok = /^https?:$/.test(new URL(href).protocol); } catch {}
    if (!ok) continue;
    const start = m.index ?? 0;
    if (start > at) out.push(text.slice(at, start));
    out.push(
      <a key={start} className="msg-link" href={href} target="_blank" rel="noopener noreferrer nofollow"
        onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        {shortLabel(raw)}
      </a>,
    );
    at = start + raw.length;
  }
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

/**
 * A chat bubble: tap it for its options (reply privately, report, delete…). It's a div rather than a button
 * so that links inside it can be tapped too (some browsers swallow taps on links inside buttons).
 */
export function MessageBubble({ mine, onOpen, children }: { mine: boolean; onOpen: () => void; children: ReactNode }) {
  return (
    <div className={`chat-msg${mine ? " mine" : ""}`} tabIndex={0} onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        onOpen();
      }}>
      {children}
    </div>
  );
}
