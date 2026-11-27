import "server-only";
import webpush from "web-push";
import { apnsConfigured, sendApns } from "./apns";
import { fcmConfigured, sendFcm } from "./fcm";
import { pathFromUrl } from "./links";
import type { supabaseAdmin } from "./supabase-admin";

/*
 * One way to buzz people, wherever they are: the iPhone app (Apple's push service), the Android app (Google's,
 * see fcm.ts) and browsers that allow notifications (Chrome, Edge and Firefox on computers and Android phones,
 * through Web Push). Env for Web Push: NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
 */

type Db = NonNullable<ReturnType<typeof supabaseAdmin>>;

/** `url` is an app link (bottega://r/ada, bottega://club/…); browsers get the same page on bottegarooms.com. */
export type Note = { title: string; body: string; url: string };

type Target = { user_id: string; token: string; platform: string; p256dh: string | null; auth: string | null };

const SITE = "https://bottegarooms.com";
let vapidReady = false;

function webConfigured(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!vapidReady) { webpush.setVapidDetails("mailto:hello@bottegarooms.com", pub, priv); vapidReady = true; }
  return true;
}

export const notifyConfigured = () => apnsConfigured() || fcmConfigured() || webConfigured();

export const webUrl = (url: string) => (url.startsWith("https://") ? url : `${SITE}${pathFromUrl(url)}`);

/**
 * Sends one note to everyone listed, on every device they've turned notifications on for.
 * Forgets devices that are gone. Returns who it reached.
 */
export async function notifyUsers(db: Db, userIds: string[], note: Note): Promise<string[]> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return [];
  const { data } = await db.from("push_tokens").select("user_id, token, platform, p256dh, auth").in("user_id", ids);
  const targets = (data ?? []) as Target[];
  const ios = apnsConfigured() ? targets.filter((t) => t.platform === "ios") : [];
  const android = fcmConfigured() ? targets.filter((t) => t.platform === "android") : [];
  const web = webConfigured() ? targets.filter((t) => t.platform === "web" && t.p256dh && t.auth) : [];

  const reached = new Set<string>();
  const gone: string[] = [];

  const [apple, google] = await Promise.all([sendApns(ios.map((t) => t.token), note), sendFcm(android.map((t) => t.token), note)]);
  for (const r of [...apple, ...google]) {
    if (r.ok) reached.add(targets.find((t) => t.token === r.token)!.user_id);
    if (r.gone) gone.push(r.token);
  }

  const payload = JSON.stringify({ title: note.title, body: note.body, url: webUrl(note.url) });
  await Promise.all(web.map(async (t) => {
    try {
      await webpush.sendNotification({ endpoint: t.token, keys: { p256dh: t.p256dh!, auth: t.auth! } }, payload, { TTL: 60 * 60 * 12, urgency: "normal" });
      reached.add(t.user_id);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) gone.push(t.token);
    }
  }));

  await Promise.all(gone.map((token) => db.rpc("drop_push_token", { p_token: token })));
  return [...reached];
}
