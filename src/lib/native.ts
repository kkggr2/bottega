import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Share } from "@capacitor/share";

/** True inside the iOS or Android app, false on the website. */
export function isNativeApp(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

/** A light tap you can feel, for dropping the needle or sliding in a DVD. Does nothing on the web. */
export function tap(): void {
  if (isNativeApp()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

/**
 * Share a link with the phone's share sheet, or copy it where sharing isn't available.
 * Resolves to what happened so the page can say so.
 */
export async function shareLink(title: string, url: string): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  try {
    if (isNativeApp()) {
      await Share.share({ title, url, dialogTitle: title });
      return "shared";
    }
    if (navigator.share) {
      await navigator.share({ title, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch (error) {
    const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
    return name === "AbortError" || /cancel/i.test(message) ? "cancelled" : "failed";
  }
}
