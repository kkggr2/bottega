"use client";

import { App } from "@capacitor/app";
import { Keyboard } from "@capacitor/keyboard";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isNativeApp } from "@/lib/native";
import { pathFromUrl } from "./push-setup";

/**
 * Makes the website behave like an app inside the iPhone app:
 * - marks the page as native, so styles can drop website habits (text selection, tap flashes)
 * - hides the keyboard's "‹ › Done" bar
 * - opens links like bottega://r/cagla (from the widget or a notification) in the right room
 */
export function NativeLinks() {
  const router = useRouter();
  useEffect(() => {
    if (!isNativeApp()) return;
    document.documentElement.classList.add("native");
    Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
    const handle = App.addListener("appUrlOpen", ({ url }) => {
      router.push(pathFromUrl(url));
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, [router]);
  return null;
}
