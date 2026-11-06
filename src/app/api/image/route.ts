import type { NextRequest } from "next/server";

/*
 * GET /api/image?url=https://image.tmdb.org/...
 * Serves cover art from our own origin so the share picture can draw it onto a canvas.
 * Browsers often reuse a cached copy loaded without CORS, which would block drawing.
 * Only the cover services Bottega uses are allowed, and only images are passed through.
 */

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();

function allowed(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  const h = url.hostname;
  return (
    h === "image.tmdb.org" ||
    h === "covers.openlibrary.org" ||
    h === "archive.org" || h.endsWith(".archive.org") || // Open Library covers redirect here
    /^is\d+-ssl\.mzstatic\.com$/.test(h) ||
    h === "i.ytimg.com" ||
    (supabaseHost !== "" && h === supabaseHost && url.pathname.startsWith("/storage/v1/object/sign/"))
  );
}

export async function GET(request: NextRequest) {
  let target: URL;
  try {
    target = new URL(request.nextUrl.searchParams.get("url") ?? "");
  } catch {
    return new Response("Bad image address", { status: 400 });
  }
  if (!allowed(target)) return new Response("Not an allowed image source", { status: 400 });

  const res = await fetch(target, { redirect: "follow" });
  // Redirects must also stay on allowed hosts.
  if (!res.ok || !allowed(new URL(res.url))) return new Response("Image unavailable", { status: 502 });
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return new Response("Not an image", { status: 415 });

  return new Response(res.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": target.hostname === supabaseHost ? "private, max-age=3000" : "public, max-age=86400, s-maxage=604800",
    },
  });
}
