import { gildedFrame, SANS } from "./card-art";
import type { TasteMatch } from "./taste";

/** A 1080×1920 picture of a Taste Match, for an Instagram Story. Returns a PNG. */

const W = 1080;
const H = 1920;

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (/^https:\/\//.test(src)) src = `/api/image?url=${encodeURIComponent(src)}`;
    const timer = setTimeout(() => resolve(null), 7000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });
}

export function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale, sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

export function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s}…`;
}

export async function drawMatchCard(
  m: TasteMatch,
  me: string,
  them: string,
  words: { headline: string; alike: string; bothLove: string; sameMakers: string; cta: string },
): Promise<Blob> {
  await document.fonts?.ready;
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "Georgia";
  const f = (size: number, italic = false, weight = 400) => `${italic ? "italic " : ""}${weight} ${size}px ${display}, Georgia, serif`;
  const sans = (size: number, weight = 600) => `${weight} ${size}px ${SANS}`;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const INK = "#2A1D13", MUTED = "#7A6A58", GOLD = "#9C7630";

  // Cream paper under a lamp, like the app.
  ctx.fillStyle = "#F3EBDA"; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, -120, 60, W / 2, -120, 1500);
  glow.addColorStop(0, "rgba(255,240,205,.95)"); glow.addColorStop(1, "rgba(255,240,205,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // Top line: the name on the left, the address on the right.
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left"; ctx.fillStyle = INK; ctx.font = f(64, true, 500);
  ctx.fillText("Bottega", 90, 170);
  ctx.textAlign = "right"; ctx.fillStyle = MUTED; ctx.font = sans(26);
  spaced(ctx, `BOTTEGAROOMS.COM/R/${me.toUpperCase()}`, W - 90, 162, 3);

  // Two initials, side by side.
  const cy = 360, r = 78;
  const dot = (cx: number, name: string, color: string) => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#F6EADB"; ctx.font = f(76, false, 500); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(name.slice(0, 1).toUpperCase(), cx, cy + 4);
    ctx.textBaseline = "alphabetic";
  };
  dot(W / 2 - 120, me, "#5A2A52");
  dot(W / 2 + 120, them, "#7A2433");
  ctx.fillStyle = MUTED; ctx.font = f(56); ctx.textAlign = "center"; ctx.fillText("×", W / 2, cy + 18);

  ctx.fillStyle = MUTED; ctx.font = f(40, true);
  ctx.fillText(fit(ctx, words.headline, W - 180), W / 2, 530);

  // The number.
  ctx.fillStyle = INK; ctx.font = f(330, true, 600);
  ctx.fillText(`${m.percent}%`, W / 2, 860);
  ctx.font = f(64, false, 450);
  ctx.fillText(words.alike, W / 2, 960);

  // What you both love, in gilded frames: up to three in a row.
  let y = 1060;
  const shared = m.both.filter((p) => p.cover_url).slice(0, 3);
  if (shared.length) {
    ctx.fillStyle = GOLD; ctx.font = sans(28);
    spacedCenter(ctx, words.bothLove.toUpperCase(), W / 2, y, 5);
    y += 70;
    const imgs = await Promise.all(shared.map((p) => loadImage(p.cover_url!)));
    const cols = shared.length, rows = 1;
    const w = shared.length === 1 ? 280 : 230, h = Math.round(w * 1.5), g = 76;
    imgs.forEach((img, i) => {
      const row = Math.floor(i / cols), col = i % cols;
      const inRow = Math.min(cols, shared.length - row * cols);
      const rowW = inRow * w + (inRow - 1) * g;
      const x = (W - rowW) / 2 + col * (w + g);
      const top = y + 36 + row * (h + g);
      gildedFrame(ctx, x, top, w, h, 16, 10);
      if (img) cover(ctx, img, x, top, w, h);
      else {
        ctx.fillStyle = "#3A2A1C"; ctx.fillRect(x, top, w, h);
        ctx.fillStyle = "#F6EADB"; ctx.font = f(26); ctx.fillText(fit(ctx, shared[i].title, w - 16), x + w / 2, top + h / 2);
      }
    });
    y += 36 + rows * h + (rows - 1) * g + 90;
  } else {
    const names = m.both.map((p) => p.title).slice(0, 3);
    if (names.length) {
      ctx.fillStyle = GOLD; ctx.font = sans(28); spacedCenter(ctx, words.bothLove.toUpperCase(), W / 2, y, 5); y += 80;
      ctx.fillStyle = INK; ctx.font = f(56, true);
      for (const n of names) { ctx.fillText(fit(ctx, n, W - 180), W / 2, y); y += 78; }
      y += 30;
    }
  }
  if (m.makers.length && y < H - 400) {
    ctx.fillStyle = GOLD; ctx.font = sans(28); spacedCenter(ctx, words.sameMakers.toUpperCase(), W / 2, y, 5); y += 70;
    ctx.fillStyle = INK; ctx.font = f(48, true);
    ctx.fillText(fit(ctx, m.makers.slice(0, 3).join(" · "), W - 180), W / 2, y);
  }

  // The invitation, on a green pill like the app's buttons.
  ctx.fillStyle = INK; ctx.font = f(58, false, 500);
  ctx.fillText(words.cta, W / 2, H - 250);
  const pill = `bottegarooms.com/r/${me}`;
  ctx.font = sans(36);
  const pw = ctx.measureText(pill).width + 90;
  ctx.fillStyle = "#4F6138";
  ctx.beginPath(); ctx.roundRect((W - pw) / 2, H - 200, pw, 88, 44); ctx.fill();
  ctx.fillStyle = "#FBF6EC"; ctx.textBaseline = "middle";
  ctx.fillText(pill, W / 2, H - 154);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
}

/** Small capitals with room between the letters, right-aligned at x. */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, gap: number) {
  const w = [...text].reduce((s, ch) => s + ctx.measureText(ch).width + gap, -gap);
  let cx = x - w;
  ctx.textAlign = "left";
  for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + gap; }
}

/** Small capitals with room between the letters, centred on x. */
function spacedCenter(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, gap: number) {
  const w = [...text].reduce((s, ch) => s + ctx.measureText(ch).width + gap, -gap);
  spaced(ctx, text, x + w / 2, y, gap);
  ctx.textAlign = "center";
}
