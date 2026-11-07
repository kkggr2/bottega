"use client";

import { App } from "@capacitor/app";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isNativeApp } from "@/lib/native";
import { pathFromUrl } from "./push-setup";

/** In the app, links like bottega://r/cagla (from the widget or a notification) open the right room. */
export function NativeLinks() {
  const router = useRouter();
  useEffect(() => {
    if (!isNativeApp()) return;
    const handle = App.addListener("appUrlOpen", ({ url }) => {
      router.push(pathFromUrl(url));
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, [router]);
  return null;
}
