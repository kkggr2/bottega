import { supabase } from "./supabase";

const BUCKET = "media";
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 60;

/** Shrink a photo to at most 1600px on its long side and re-encode it as JPEG. */
export async function compressImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** How long an audio file plays, read from its metadata in the browser. */
export function audioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    audio.src = url;
  });
}

const AUDIO_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  webm: "audio/webm",
  wav: "audio/wav",
};

export function audioTypeFor(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_TYPES[ext] ?? null;
}

/** Upload into the owner's folder; returns the storage path to keep on the piece. */
export async function uploadMedia(ownerId: string, blob: Blob, ext: string, contentType: string): Promise<string> {
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase().storage.from(BUCKET).upload(path, blob, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeMedia(paths: (string | null | undefined)[]): Promise<void> {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length) await supabase().storage.from(BUCKET).remove(list);
}

const signedCache = new Map<string, { url: string; expires: number }>();

/** Signed URLs for private media. Storage rules decide who gets one. */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of new Set(paths)) {
    const hit = signedCache.get(p);
    if (hit && hit.expires > now + 60_000) out[p] = hit.url;
    else missing.push(p);
  }
  if (missing.length) {
    const { data } = await supabase().storage.from(BUCKET).createSignedUrls(missing, 3600);
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) {
        signedCache.set(row.path, { url: row.signedUrl, expires: now + 3600_000 });
        out[row.path] = row.signedUrl;
      }
    }
  }
  return out;
}
