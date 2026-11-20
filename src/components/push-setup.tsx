"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { pushPermission, registerPush } from "@/lib/push";
import { useAuth } from "./auth";

/** In the iPhone app: if notifications are already allowed, keep this phone registered on every launch. */
export function PushSetup() {
  const auth = useAuth();
  const router = useRouter();
  const userId = auth.status === "ready" ? auth.profile.id : null;
  useEffect(() => {
    if (!userId) return;
    pushPermission().then((p) => {
      if (p === "granted") registerPush(userId, (url) => router.push(pathFromUrl(url))).catch(() => {});
    });
  }, [userId, router]);
  return null;
}

export function pathFromUrl(url: string): string {
  // bottega://r/cagla (widget, notifications) or https://bottegarooms.com/r/cagla (a shared link).
  const m = url.match(/^(?:bottega:\/\/|https:\/\/(?:www\.)?bottegarooms\.com\/)r\/([a-z0-9_]{3,20})/i);
  if (m) return `/r/${m[1].toLowerCase()}`;
  // A club invitation, club page or the start page, from a shared https link.
  const club = url.match(/^https:\/\/(?:www\.)?bottegarooms\.com(\/(?:join|club)\/[a-z0-9-]{3,40}(?:\/quiz\/[a-z0-9-]{2,60})?|\/start)(?:[?#].*)?$/i);
  if (club) return club[1].toLowerCase();
  // bottega://messages/cagla — a private message notification.
  const dm = url.match(/^bottega:\/\/messages\/([a-z0-9_]{3,20})/i);
  if (dm) return `/messages?with=${dm[1].toLowerCase()}`;
  // bottega://quiz — the daily quiz reminder.
  if (/^bottega:\/\/quiz\b/i.test(url)) return "/quiz/today";
  // bottega://year — Your Year in the Room (the December notification, and testing it any time).
  if (/^bottega:\/\/year\b/i.test(url)) return "/year";
  // bottega://room — your own room (the "your turntable is free" nudge); the home screen leads there.
  return "/";
}
