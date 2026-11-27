import "server-only";
import { createPrivateKey, sign } from "node:crypto";

/*
 * Sends Android app notifications through Google (Firebase Cloud Messaging, HTTP v1).
 * Env: FCM_SERVICE_ACCOUNT, the whole JSON file from Firebase → Project settings → Service accounts →
 * Generate new private key (pasted as it is; base64 of it works too).
 */

/** The Android notification channel ("Friends and clubs"). The app creates it with the same id (src/lib/push.ts). */
const CHANNEL = "bottega";

type Account = { project_id: string; client_email: string; private_key: string };

let account: Account | null | undefined;

function serviceAccount(): Account | null {
  if (account !== undefined) return account;
  const raw = process.env.FCM_SERVICE_ACCOUNT?.trim();
  account = null;
  if (!raw) return account;
  try {
    const a = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8")) as Partial<Account>;
    if (a.project_id && a.client_email && a.private_key) account = a as Account;
  } catch {}
  return account;
}

export const fcmConfigured = () => serviceAccount() !== null;

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

let cached: { token: string; until: number } | null = null;

/** Google swaps a signed note from the service account for an access token that lasts an hour. */
async function accessToken(a: Account): Promise<string | null> {
  if (cached && cached.until > Date.now()) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: a.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const key = createPrivateKey(a.private_key.replace(/\\n/g, "\n"));
  const assertion = `${header}.${claims}.${b64url(sign("sha256", Buffer.from(`${header}.${claims}`), key))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) return null;
  cached = { token: j.access_token, until: Date.now() + ((j.expires_in ?? 3600) - 300) * 1000 };
  return j.access_token;
}

export type FcmResult = { token: string; ok: boolean; gone: boolean };

/** Sends one notification to several Android phones. `gone` means the app was uninstalled: forget that phone. */
export async function sendFcm(tokens: string[], note: { title: string; body: string; url: string }): Promise<FcmResult[]> {
  const a = serviceAccount();
  if (!a || !tokens.length) return [];
  const bearer = await accessToken(a).catch(() => null);
  if (!bearer) return tokens.map((token) => ({ token, ok: false, gone: false }));
  const endpoint = `https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`;

  return Promise.all(tokens.map(async (token): Promise<FcmResult> => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: note.title, body: note.body },
            // Tapping it opens this page in the app (the same bottega:// links the iPhone app gets).
            data: { url: note.url },
            android: { ttl: "43200s", notification: { channel_id: CHANNEL } },
          },
        }),
      });
      if (res.ok) return { token, ok: true, gone: false };
      // Only a phone Google no longer knows is forgotten; any other error (ours or theirs) keeps it for next time.
      const err = (await res.json().catch(() => null)) as { error?: { status?: string; details?: { errorCode?: string }[] } } | null;
      const code = err?.error?.details?.find((d) => d.errorCode)?.errorCode ?? err?.error?.status;
      return { token, ok: false, gone: res.status === 404 || code === "UNREGISTERED" };
    } catch {
      return { token, ok: false, gone: false };
    }
  }));
}
