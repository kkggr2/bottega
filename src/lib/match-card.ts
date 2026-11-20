import type { TasteMatch } from "./taste";

/** A 1080×1920 picture of a Taste Match, for an Instagram Story. Returns a PNG. */

const W = 1080;
const H = 1920;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (/^https:\/\//.test(src)) src = `/api/image?url=${encodeURIComponent(src)}`;
    const timer = setTimeout(() => resolve(null), 7000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale, sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
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
  const f = (size: number, italic = false) => `${italic ? "italic " : ""}400 ${size}px ${display}, Georgia, serif`;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const INK = "#F3E6D6", MUTED = "rgba(243,230,214,.68)", ACCENT = "#E0A35C";

  // Wine wall with a lamp glow, like the Salon.
  ctx.fillStyle = "#3A1A22"; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 260, 40, W / 2, 260, 1100);
  glow.addColorStop(0, "rgba(224,163,92,.30)"); glow.addColorStop(1, "rgba(224,163,92,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = MUTED; ctx.font = f(36);
  ctx.fillText("BOTTEGA · TASTE MATCH", W / 2, 170);

  ctx.fillStyle = INK; ctx.font = f(64);
  ctx.fillText(fit(ctx, words.headline, W - 140), W / 2, 330);

  ctx.fillStyle = ACCENT; ctx.font = f(300);
  ctx.fillText(`${m.percent}%`, W / 2, 680);
  ctx.fillStyle = INK; ctx.font = f(64, true);
  ctx.fillText(words.alike, W / 2, 780);

  let y = 900;
  const shared = m.both.filter((p) => p.cover_url).slice(0, 3);
  if (shared.length) {
    ctx.fillStyle = MUTED; ctx.font = f(36);
    ctx.fillText(words.bothLove.toUpperCase(), W / 2, y);
    y += 50;
    const imgs = await Promise.all(shared.map((p) => loadImage(p.cover_url!)));
    const cw = 260, ch = 390, gap = 40;
    const total = shared.length * cw + (shared.length - 1) * gap;
    let x = (W - total) / 2;
    imgs.forEach((img, i) => {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
      ctx.fillStyle = "#1E0E12"; ctx.fillRect(x, y, cw, ch);
      ctx.restore();
      if (img) cover(ctx, img, x, y, cw, ch);
      else { ctx.fillStyle = INK; ctx.font = f(30); ctx.fillText(fit(ctx, shared[i].title, cw - 20), x + cw / 2, y + ch / 2); }
      x += cw + gap;
    });
    y += ch + 90;
  } else {
    const names = m.both.map((p) => p.title).slice(0, 3);
    if (names.length) {
      ctx.fillStyle = MUTED; ctx.font = f(36); ctx.fillText(words.bothLove.toUpperCase(), W / 2, y); y += 70;
      ctx.fillStyle = INK; ctx.font = f(54, true);
      for (const n of names) { ctx.fillText(fit(ctx, n, W - 160), W / 2, y); y += 76; }
      y += 40;
    }
  }
  if (m.makers.length) {
    ctx.fillStyle = MUTED; ctx.font = f(36); ctx.fillText(words.sameMakers.toUpperCase(), W / 2, y); y += 70;
    ctx.fillStyle = INK; ctx.font = f(50, true);
    ctx.fillText(fit(ctx, m.makers.slice(0, 3).join(" · "), W - 160), W / 2, y);
  }

  ctx.fillStyle = INK; ctx.font = f(58);
  ctx.fillText(words.cta, W / 2, H - 230);
  ctx.fillStyle = ACCENT; ctx.font = f(42);
  ctx.fillText(`bottegarooms.com/r/${me}`, W / 2, H - 150);
  void them;

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
}
