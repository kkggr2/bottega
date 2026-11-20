/*
 * Android App Links: tells Android that bottegarooms.com links may open the Bottega app.
 * ANDROID_CERT_SHA256 (in Vercel) is the app signing key's SHA-256 fingerprint from Google Play Console →
 * your app → Test and release → App integrity → App signing. Several can be separated by commas.
 */
export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const body = fingerprints.length
    ? [{
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: "com.kkggr2.bottega", sha256_cert_fingerprints: fingerprints },
      }]
    : [];
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
