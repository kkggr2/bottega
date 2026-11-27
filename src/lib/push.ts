import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "./supabase";

/*
 * Notifications: in the iPhone app (Apple's push service), the Android app (Google's, through Firebase), and in
 * browsers that allow them (Chrome, Edge and Firefox on computers and Android phones, through Web Push and /sw.js).
 * Safari on an iPhone only allows them for sites added to the home screen, so iPhone people are pointed to the app.
 * We only ask once someone has a friend or a club (an empty shelf has nothing to tell them), never on first visit.
 */

const TOKEN_KEY = "bottega.pushToken";
const DISMISS_KEY = "bottega.pushAskDismissed";
const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/**
 * The first Android build with Firebase inside. Every Android build loads this same site, and asking an older one
 * to register would crash it, so those simply don't offer notifications.
 */
const ANDROID_PUSH_BUILD = 3;
/** The Android channel notifications arrive on; the server sends to the same id (src/lib/fcm.ts). */
const ANDROID_CHANNEL = "bottega";

type Kind = "ios" | "android" | "web" | null;

function platformKind(): Kind {
  if (typeof window === "undefined") return null;
  const platform = Capacitor.getPlatform();
  if (platform === "ios" || platform === "android") return platform;
  return VAPID && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window ? "web" : null;
}

let androidReady: Promise<boolean> | null = null;

async function kind(): Promise<Kind> {
  const k = platformKind();
  if (k !== "android") return k;
  androidReady ??= App.getInfo().then((info) => Number(info.build) >= ANDROID_PUSH_BUILD).catch(() => false);
  return (await androidReady) ? "android" : null;
}

export const pushAvailable = async () => (await kind()) !== null;

export async function pushPermission(): Promise<"granted" | "denied" | "prompt" | "unavailable"> {
  const k = await kind();
  if (!k) return "unavailable";
  if (k === "web") {
    const p = Notification.permission;
    return p === "granted" ? "granted" : p === "denied" ? "denied" : "prompt";
  }
  try {
    const { receive } = await PushNotifications.checkPermissions();
    return receive === "granted" ? "granted" : receive === "denied" ? "denied" : "prompt";
  } catch {
    return "unavailable";
  }
}

async function save(row: { token: string; platform: "ios" | "android" | "web"; p256dh?: string; auth?: string }, userId: string) {
  try { localStorage.setItem(TOKEN_KEY, row.token); } catch {}
  await supabase().from("push_tokens").upsert(
    { ...row, user_id: userId, updated_at: new Date().toISOString() },
    { onConflict: "token" },
  );
}

const b64 = (buf: ArrayBuffer | null) => (buf ? btoa(String.fromCharCode(...new Uint8Array(buf))) : "");
function vapidKey(): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (VAPID.length % 4)) % 4);
  const raw = atob((VAPID + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Browsers: the subscription for this browser, made once and kept saved to the signed-in account. */
async function registerWeb(userId: string): Promise<void> {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey() }));
  await save({ token: sub.endpoint, platform: "web", p256dh: b64(sub.getKey("p256dh")), auth: b64(sub.getKey("auth")) }, userId);
}

let listening = false;

/** Registers this device and keeps it saved to the signed-in account. Safe to call on every visit. */
export async function registerPush(userId: string, onOpen: (url: string) => void): Promise<void> {
  const k = await kind();
  if (k === "web") return registerWeb(userId);
  if (!k) return;
  if (!listening) {
    listening = true;
    if (k === "android") {
      // One calm channel for everything (friends, clubs, messages): a sound and the status bar, no pop-over.
      await PushNotifications.createChannel({
        id: ANDROID_CHANNEL, name: "Friends and clubs", description: "When friends put something on, and news from your clubs",
        importance: 3, visibility: 0,
      }).catch(() => {});
    }
    await PushNotifications.addListener("registration", ({ value }) => save({ token: value, platform: k }, userId));
    await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const url = (notification.data as { url?: string } | undefined)?.url;
      if (url) onOpen(url);
    });
  }
  await PushNotifications.register();
}

/** Asks for permission (from a tap), then registers. Returns whether notifications are on. */
export async function enablePush(userId: string, onOpen: (url: string) => void): Promise<boolean> {
  const k = await kind();
  if (k === "web") {
    if ((await Notification.requestPermission()) !== "granted") return false;
    await registerWeb(userId);
    return true;
  }
  if (!k) return false;
  const { receive } = await PushNotifications.requestPermissions();
  if (receive !== "granted") return false;
  await registerPush(userId, onOpen);
  return true;
}

/** On sign-out, this device stops getting that account's notifications. */
export async function forgetPushToken(): Promise<void> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) await supabase().from("push_tokens").delete().eq("token", token);
    localStorage.removeItem(TOKEN_KEY);
    if (platformKind() === "web") {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      await (await reg?.pushManager.getSubscription())?.unsubscribe();
    }
  } catch {}
}

export function pushAskDismissed(): boolean {
  try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
}
export function dismissPushAsk(): void {
  try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
}

async function authedPost(path: string, body?: unknown): Promise<void> {
  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {}
}

/** Right after putting something on: tell friends. Fire and forget. */
export const notifyFriends = () => authedPost("/api/push/now");

/** Right after something happens in a club (a message, a vote, a meeting, a new book): tell its members. Fire and forget. */
export const notifyClub = (clubId: string, kind: "message" | "poll" | "meeting" | "reading" | "pin") => authedPost("/api/push/club", { clubId, kind });
