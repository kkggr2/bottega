import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "./supabase";

/*
 * Phone notifications when friends put something on. iPhone only for now.
 * We only ask once someone has a friend (an empty shelf has nothing to tell them), and never on first launch.
 */

const TOKEN_KEY = "bottega.pushToken";
const DISMISS_KEY = "bottega.pushAskDismissed";

export const pushAvailable = () => typeof window !== "undefined" && Capacitor.getPlatform() === "ios";

export async function pushPermission(): Promise<"granted" | "denied" | "prompt" | "unavailable"> {
  if (!pushAvailable()) return "unavailable";
  try {
    const { receive } = await PushNotifications.checkPermissions();
    return receive === "granted" ? "granted" : receive === "denied" ? "denied" : "prompt";
  } catch {
    return "unavailable";
  }
}

let listening = false;

/** Registers this phone and keeps its token saved to the signed-in account. Safe to call on every launch. */
export async function registerPush(userId: string, onOpen: (url: string) => void): Promise<void> {
  if (!pushAvailable()) return;
  if (!listening) {
    listening = true;
    await PushNotifications.addListener("registration", async ({ value }) => {
      try { localStorage.setItem(TOKEN_KEY, value); } catch {}
      await supabase().from("push_tokens").upsert(
        { token: value, user_id: userId, platform: "ios", updated_at: new Date().toISOString() },
        { onConflict: "token" },
      );
    });
    await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const url = (notification.data as { url?: string } | undefined)?.url;
      if (url) onOpen(url);
    });
  }
  await PushNotifications.register();
}

/** Asks for permission (from a tap), then registers. Returns whether notifications are on. */
export async function enablePush(userId: string, onOpen: (url: string) => void): Promise<boolean> {
  if (!pushAvailable()) return false;
  const { receive } = await PushNotifications.requestPermissions();
  if (receive !== "granted") return false;
  await registerPush(userId, onOpen);
  return true;
}

/** On sign-out, this phone stops getting that account's notifications. */
export async function forgetPushToken(): Promise<void> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) await supabase().from("push_tokens").delete().eq("token", token);
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function pushAskDismissed(): boolean {
  try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
}
export function dismissPushAsk(): void {
  try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
}

/** Right after putting something on: tell friends' phones. Fire and forget. */
export async function notifyFriends(): Promise<void> {
  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/push/now", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  } catch {}
}
