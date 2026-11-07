import "server-only";
import { createPrivateKey, sign } from "node:crypto";
import { connect } from "node:http2";

/*
 * Sends iPhone notifications through Apple (APNs) with a signing key from the Apple Developer account.
 * Env: APNS_KEY_P8 (the .p8 file's contents), APNS_KEY_ID, APNS_TEAM_ID, and optionally APNS_SANDBOX=1
 * for apps installed from Xcode (TestFlight and App Store builds use production).
 */

const TOPIC = "com.kkggr2.bottega";

let cached: { jwt: string; at: number } | null = null;

export function apnsConfigured(): boolean {
  return Boolean(process.env.APNS_KEY_P8 && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID);
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/** Apple accepts the same token for up to an hour; make a new one every 50 minutes. */
function authToken(): string {
  if (cached && Date.now() - cached.at < 50 * 60 * 1000) return cached.jwt;
  const header = b64url(JSON.stringify({ alg: "ES256", kid: process.env.APNS_KEY_ID }));
  const claims = b64url(JSON.stringify({ iss: process.env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }));
  const key = createPrivateKey(process.env.APNS_KEY_P8!.replace(/\\n/g, "\n"));
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), { key, dsaEncoding: "ieee-p1363" });
  const jwt = `${header}.${claims}.${b64url(signature)}`;
  cached = { jwt, at: Date.now() };
  return jwt;
}

export type ApnsResult = { token: string; ok: boolean; gone: boolean; reason?: string };

/** Sends one notification to several phones over a single connection. */
export async function sendApns(tokens: string[], note: { title: string; body: string; url: string }): Promise<ApnsResult[]> {
  if (!tokens.length) return [];
  const host = process.env.APNS_SANDBOX === "1" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  const client = connect(host);
  const jwt = authToken();
  const payload = JSON.stringify({ aps: { alert: { title: note.title, body: note.body }, sound: "default" }, url: note.url });
  try {
    return await Promise.all(tokens.map((token) => new Promise<ApnsResult>((resolve) => {
      const req = client.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        authorization: `bearer ${jwt}`,
        "apns-topic": TOPIC,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      });
      let status = 0;
      let body = "";
      req.on("response", (h) => { status = Number(h[":status"]); });
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        const reason = body ? (JSON.parse(body) as { reason?: string }).reason : undefined;
        resolve({ token, ok: status === 200, gone: status === 410 || reason === "BadDeviceToken" || reason === "Unregistered", reason });
      });
      req.on("error", (e) => resolve({ token, ok: false, gone: false, reason: e.message }));
      req.setTimeout(10_000, () => { req.close(); resolve({ token, ok: false, gone: false, reason: "timeout" }); });
      req.end(payload);
    })));
  } finally {
    client.close();
  }
}
