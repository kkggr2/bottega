import { imageOf } from "./piece-media";
import { THEMES } from "./themes";
import type { Piece, Room } from "./types";

/** Draws a 1080×1920 picture of a room (Instagram Story size) and returns it as a PNG. */

const W = 1080;
const H = 1920;
const CLOTH = ["#7B2E2E", "#2E4A6B", "#3F5E3A", "#8A6D2F", "#4B3A5E", "#2B2B2B", "#A5532C", "#5E7F86"];

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Through our own server: same origin, so the canvas can always be exported.
    if (/^https:\/\//.test(src)) src = `/api/image?url=${encodeURIComponent(src)}`;
    const timer = setTimeout(() => resolve(null), 7000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });
}

/**
 * A film without its own picture still gets its real poster on the card, found by title on TMDB.
 * Scenes carry a wide video still, which a tall frame would crop, so they look for the film's poster first.
 */
async function posterFor(piece: Piece, urls: Record<string, string>): Promise<{ src: string; wide: boolean } | null> {
  const own = imageOf(piece, urls);
  if (own && piece.type !== "scene") return { src: own, wide: false };
  const found = await lookupPoster(piece);
  if (found) return { src: found, wide: false };
  return own ? { src: own, wide: true } : null;
}

async function lookupPoster(piece: Piece): Promise<string | null> {
  try {
    const year = piece.subtitle.match(/\b(19|20)\d{2}\b/)?.[0];
    const res = await fetch(`/api/films?q=${encodeURIComponent(piece.title)}`);
    if (!res.ok) return null;
    const { results } = (await res.json()) as { results: { title: string; subtitle: string; cover_url: string | null }[] };
    const withPoster = results.filter((r) => r.cover_url);
    const match = withPoster.find((r) => year && r.subtitle.includes(year)) ?? withPoster[0];
    return match?.cover_url?.replace("/w185/", "/w500/") ?? null;
  } catch {
    return null;
  }
}

/** Draws a wide still whole, centered on a dark mat, instead of cropping it to the frame. */
function contain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#14100C";
  ctx.fillRect(x, y, w, h);
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale, sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else line = next;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function shadow(ctx: CanvasRenderingContext2D, on: boolean) {
  ctx.shadowColor = on ? "rgba(0,0,0,.35)" : "transparent";
  ctx.shadowBlur = on ? 28 : 0;
  ctx.shadowOffsetY = on ? 12 : 0;
}

export async function drawRoomCard(room: Room, username: string, pieces: Piece[], urls: Record<string, string>, link: string): Promise<Blob> {
  await document.fonts?.ready;
  const css = getComputedStyle(document.documentElement);
  const display = `${css.getPropertyValue("--ff-display").trim() || "Georgia"}, Georgia, serif`;
  const mono = `${css.getPropertyValue("--ff-mono").trim() || "Menlo"}, Menlo, monospace`;
  const body = `${css.getPropertyValue("--ff-body").trim() || "system-ui"}, system-ui, sans-serif`;
  const t = THEMES[room.theme] ?? THEMES.oak;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Wall, wallpaper, floor.
  ctx.fillStyle = t.wall;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = t.ink;
  if (room.wallpaper === "stripe") for (let x = 44; x < W; x += 88) ctx.fillRect(x, 0, 44, H);
  if (room.wallpaper === "dots") for (let y = 22; y < H; y += 44) for (let x = 22; x < W; x += 44) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
  if (room.wallpaper === "grid") { for (let x = 0; x < W; x += 68) ctx.fillRect(x, 0, 2, H); for (let y = 0; y < H; y += 68) ctx.fillRect(0, y, W, 2); }
  ctx.globalAlpha = 1;
  const floorY = H - 300;
  ctx.fillStyle = t.floor;
  ctx.fillRect(0, floorY, W, H - floorY);

  // Door sign.
  ctx.fillStyle = t.ink;
  ctx.textBaseline = "alphabetic";
  ctx.font = `500 28px ${mono}`;
  ctx.fillText(`@${username.toUpperCase()}'S ROOM`.split("").join(String.fromCharCode(8202)), 80, 140);
  ctx.font = `400 104px ${display}`;
  const nameLines = wrap(ctx, room.name, W - 160, 2);
  nameLines.forEach((l, i) => ctx.fillText(l, 80, 250 + i * 104));
  let y = 250 + nameLines.length * 104;
  if (room.tagline) {
    ctx.font = `italic 400 40px ${display}`;
    ctx.globalAlpha = 0.75;
    wrap(ctx, room.tagline, W - 160, 2).forEach((l, i) => ctx.fillText(l, 80, y + 10 + i * 50));
    ctx.globalAlpha = 1;
    y += 110;
  }

  const of = (type: Piece["type"]) => pieces.filter((p) => p.type === type);
  const posters = [...of("poster"), ...of("scene")].slice(0, 3);
  const songs = of("song").slice(0, 4);
  const books = of("book").slice(0, 12);
  const found = await Promise.all(posters.map((p) => posterFor(p, urls)));
  const wide = found.map((f) => Boolean(f?.wide));
  const art = await Promise.all([
    ...found.map((f) => (f ? loadImage(f.src) : Promise.resolve(null))),
    ...songs.map((p) => {
      const src = imageOf(p, urls);
      return src ? loadImage(src) : Promise.resolve(null);
    }),
  ]);

  // The shelf and records stand on the floor; the posters hang centered in the wall space above them.
  const shelfTop = floorY - 230;
  const wallBottom = books.length || songs.length ? shelfTop : floorY;

  // Framed posters.
  if (posters.length) {
    const fw = 280, fh = 420, gap = (W - 160 - fw * 3) / 2;
    const top = Math.max(y + 60, y + (wallBottom - y - fh) / 2);
    posters.forEach((p, i) => {
      const x = 80 + i * (fw + gap) + (posters.length < 3 ? ((3 - posters.length) * (fw + gap)) / 2 : 0);
      shadow(ctx, true);
      ctx.fillStyle = "#20170F";
      ctx.fillRect(x - 16, top - 16, fw + 32, fh + 32);
      shadow(ctx, false);
      ctx.fillStyle = "#E9E1CF";
      ctx.fillRect(x - 5, top - 5, fw + 10, fh + 10);
      const img = art[i];
      if (img && wide[i]) contain(ctx, img, x, top, fw, fh);
      else if (img) cover(ctx, img, x, top, fw, fh);
      else {
        const g = ctx.createLinearGradient(x, top, x + fw, top + fh);
        g.addColorStop(0, t.accent);
        g.addColorStop(1, "#1A120C");
        ctx.fillStyle = g;
        ctx.fillRect(x, top, fw, fh);
        ctx.fillStyle = "#F7EEDC";
        ctx.font = `400 40px ${display}`;
        wrap(ctx, p.title, fw - 40, 4).forEach((l, j, all) => ctx.fillText(l, x + 20, top + fh - 24 - (all.length - 1 - j) * 44));
      }
    });
    y = top + fh + 40;
  }

  // Records fanned out on the floor line.
  if (songs.length) {
    const size = 200, step = 120;
    const startX = W - 80 - size - step * (songs.length - 1);
    songs.forEach((s, i) => {
      const x = startX + i * step;
      const top = shelfTop + 20 + (i % 2) * 10;
      ctx.save();
      ctx.translate(x + size / 2, top + size / 2);
      ctx.rotate(((i % 3) - 1) * 0.05);
      // Record peeking out of its sleeve.
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(size * 0.28, 0, size * 0.46, 0, Math.PI * 2);
      ctx.fill();
      shadow(ctx, true);
      const img = art[posters.length + i];
      ctx.fillStyle = t.accent;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      shadow(ctx, false);
      if (img) cover(ctx, img, -size / 2, -size / 2, size, size);
      ctx.restore();
    });
  }

  // Books on a little shelf.
  if (books.length) {
    const shelfW = songs.length ? 440 : W - 160;
    ctx.fillStyle = "#5A3B24";
    shadow(ctx, true);
    ctx.fillRect(70, shelfTop, shelfW + 20, 250);
    shadow(ctx, false);
    ctx.fillStyle = "#3A2616";
    ctx.fillRect(84, shelfTop + 14, shelfW - 8, 222);
    let x = 96;
    books.forEach((b, i) => {
      const w = 40 + Math.min(16, b.title.length);
      const h = 150 + ((i * 37) % 50);
      if (x + w > 70 + shelfW) return;
      ctx.fillStyle = CLOTH[i % CLOTH.length];
      ctx.fillRect(x, shelfTop + 236 - h, w, h);
      ctx.fillStyle = "rgba(226,196,120,.7)";
      ctx.fillRect(x + 4, shelfTop + 236 - h + 12, w - 8, 3);
      ctx.save();
      ctx.translate(x + w / 2 + 7, shelfTop + 226);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#F2E8D5";
      ctx.font = `400 22px ${display}`;
      ctx.fillText(wrap(ctx, b.title, h - 40, 1)[0] ?? "", 0, 0);
      ctx.restore();
      x += w + 4;
    });
  }

  // Footer card on the floor.
  const counts = [
    [posters.length ? of("poster").length + of("scene").length : 0, "films"],
    [of("song").length, "records"],
    [of("book").length, "books"],
  ].filter(([n]) => n).map(([n, label]) => `${n} ${label}`).join(" · ");
  ctx.fillStyle = "#F4ECD8";
  shadow(ctx, true);
  ctx.beginPath();
  ctx.roundRect(80, floorY + 60, W - 160, 180, 22);
  ctx.fill();
  shadow(ctx, false);
  ctx.fillStyle = "#2A2420";
  ctx.font = `400 52px ${display}`;
  ctx.fillText("Step into my room on Bottega", 120, floorY + 135);
  ctx.font = `400 30px ${body}`;
  ctx.globalAlpha = 0.7;
  ctx.fillText([counts, link.replace(/^https?:\/\//, "")].filter(Boolean).join("  ·  "), 120, floorY + 195);
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/png"));
}
