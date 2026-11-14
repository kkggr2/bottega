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
  // bottega://messages/cagla — a private message notification.
  const dm = url.match(/^bottega:\/\/messages\/([a-z0-9_]{3,20})/i);
  if (dm) return `/messages?with=${dm[1].toLowerCase()}`;
  return "/";
}
