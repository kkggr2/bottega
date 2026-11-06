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

/**
 * Share a picture (the room card) with the share sheet. On the website without file sharing,
 * it downloads instead so it can be posted by hand.
 */
export async function shareImage(blob: Blob, filename: string, title: string, url: string): Promise<"shared" | "saved" | "cancelled" | "failed"> {
  try {
    if (isNativeApp()) {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
      await Share.share({ title, text: url, files: [uri], dialogTitle: title });
      return "shared";
    }
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text: url });
      return "shared";
    }
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    return "saved";
  } catch (error) {
    const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
    return name === "AbortError" || /cancel/i.test(message) ? "cancelled" : "failed";
  }
}
