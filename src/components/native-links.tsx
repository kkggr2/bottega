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
 * - hides the keyboard's "‹ › Done" bar, and the tab bar while the keyboard is up
 * - opens links like bottega://r/cagla (from the widget or a notification) in the right room
 */
export function NativeLinks() {
  const router = useRouter();
  useEffect(() => {
    if (!isNativeApp()) return;
    document.documentElement.classList.add("native");
    Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
    // While typing, the tab bar steps aside (like any iPhone app) instead of riding on top of the keyboard.
    const root = document.documentElement;
    const shown = Keyboard.addListener("keyboardWillShow", () => root.classList.add("kb-open"));
    const hidden = Keyboard.addListener("keyboardWillHide", () => root.classList.remove("kb-open"));
    // Once the keyboard is up (and the page has shrunk), bring the field you're typing in back into view.
    const reveal = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || !/^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
      const r = el.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 12 || r.top < 0) window.scrollBy({ top: r.top - window.innerHeight / 3 });
    };
    const up = Keyboard.addListener("keyboardDidShow", () => { reveal(); setTimeout(reveal, 250); });
    const handle = App.addListener("appUrlOpen", ({ url }) => {
      router.push(pathFromUrl(url));
    });
    return () => {
      handle.then((h) => h.remove());
      shown.then((h) => h.remove());
      hidden.then((h) => h.remove());
      up.then((h) => h.remove());
      root.classList.remove("kb-open");
    };
  }, [router]);
  return null;
}
