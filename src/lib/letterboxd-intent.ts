/*
 * "Bring your Letterboxd": someone who came for that (the welcome page button, or bottegarooms.com/letterboxd)
 * lands in their new room with the Letterboxd import already open. Kept for a day across sign-up.
 */
const KEY = "bottega.bringLetterboxd";

export function rememberLetterboxd(): void {
  try { localStorage.setItem(KEY, String(Date.now())); } catch {}
}

/** True once, within a day of asking; then forgotten. */
export function takeLetterboxd(): boolean {
  try {
    const at = Number(localStorage.getItem(KEY) ?? 0);
    localStorage.removeItem(KEY);
    return Date.now() - at < 864e5;
  } catch {
    return false;
  }
}

export function wantsLetterboxd(): boolean {
  try { return Date.now() - Number(localStorage.getItem(KEY) ?? 0) < 864e5; } catch { return false; }
}
