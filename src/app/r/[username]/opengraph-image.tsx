import { OG_SIZE, roomPreview, type OgRoom } from "@/lib/room-og";

/*
 * The picture shown when a room link is pasted somewhere (drawn in lib/room-og.tsx).
 * Reads with the public key, so it only ever sees rooms that are open to everyone.
 */

export const alt = "A room on Bottega";
export const size = OG_SIZE;
export const contentType = "image/png";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function rest<T>(path: string): Promise<T[]> {
  if (!SUPA || !KEY) return [];
  try {
    const res = await fetch(`${SUPA}/rest/v1/${path}`, { headers: { apikey: KEY }, next: { revalidate: 3600 } });
    return res.ok ? ((await res.json()) as T[]) : [];
  } catch {
    return [];
  }
}

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const username = decodeURIComponent((await params).username).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
  const [profile] = await rest<{ id: string }>(`profiles?select=id&username=eq.${username}`);
  const [room] = profile
    ? await rest<NonNullable<OgRoom>>(`rooms?select=name,tagline,theme&visibility=eq.public&owner_id=eq.${profile.id}`)
    : [];
  const covers = room
    ? await rest<{ cover_url: string }>(`pieces?select=cover_url&owner_id=eq.${profile.id}&cover_url=not.is.null&type=in.(poster,book,song)&order=position.asc&limit=3`)
    : [];
  return roomPreview(username, room ?? null, covers.map((c) => c.cover_url));
}
