import { InAppReview } from "@capacitor-community/in-app-review";
import { isNativeApp } from "./native";

/*
 * Apple's own "Enjoying Bottega?" stars, asked only at a happy moment (a good quiz score,
 * a finished room) and at most once every 60 days. Apple also caps it at three times a year
 * and may decide not to show it at all. Does nothing on the website.
 */

const KEY = "bottega.reviewAskedAt";
const EVERY_MS = 60 * 864e5;

export function askForReviewSoon(): void {
  if (!isNativeApp()) return;
  try {
    const last = Number(localStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < EVERY_MS) return;
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    return;
  }
  // A short pause, so the good moment lands first.
  setTimeout(() => { InAppReview.requestReview().catch(() => {}); }, 1500);
}
