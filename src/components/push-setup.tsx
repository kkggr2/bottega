"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { pathFromUrl } from "@/lib/links";
import { pushPermission, registerPush } from "@/lib/push";
import { useAuth } from "./auth";

export { pathFromUrl };

/** If notifications are already allowed (iPhone app or browser), keep this device registered on every visit. */
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

