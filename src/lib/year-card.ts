import { cover, fit, loadImage } from "./match-card";

/** One card of Your Year in the Room as a 1080×1920 Story picture. */

export type YearCardSpec = {
  bg: string;
  ink: string;
  accent: string;
  kicker: string;
  big: string;
  line?: string;
  covers?: string[];
  foot: string;
};

const W = 1080;
const H = 1920;

function wrapLines(ctx: CanvasRenderingContext2D, text: string, max: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) { out.push(line); line = w; if (out.length === maxLines) break; } else line = next;
  }
  if (out.length < maxLines && line) out.push(line);
  return out;
}

export async function drawYearCard(c: YearCardSpec): Promise<Blob> {
  await document.fonts?.ready;
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "Georgia";
  const f = (size: number, italic = false) => `${italic ? "italic " : ""}400 ${size}px ${display}, Georgia, serif`;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 200, 40, W / 2, 200, 1200);
  glow.addColorStop(0, "rgba(255,220,170,.22)"); glow.addColorStop(1, "rgba(255,220,170,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = c.accent; ctx.font = f(38);
  ctx.fillText(c.kicker.toUpperCase(), W / 2, 260);

  ctx.fillStyle = c.ink;
  let size = 150;
  ctx.font = f(size);
  while (size > 70 && wrapLines(ctx, c.big, W - 160, 3).some((l) => ctx.measureText(l).width > W - 160)) { size -= 8; ctx.font = f(size); }
  let lines = wrapLines(ctx, c.big, W - 160, 3);
  if (lines.length > 2 && size > 96) { size = 96; ctx.font = f(size); lines = wrapLines(ctx, c.big, W - 160, 3); }
  let y = 470;
  for (const l of lines) { ctx.fillText(l, W / 2, y); y += size * 1.08; }

  if (c.line) {
    ctx.globalAlpha = 0.82; ctx.font = f(46, true);
    y += 20;
    for (const l of wrapLines(ctx, c.line, W - 200, 4)) { ctx.fillText(l, W / 2, y); y += 62; }
    ctx.globalAlpha = 1;
  }

  const covers = (c.covers ?? []).slice(0, 6);
  if (covers.length) {
    const imgs = (await Promise.all(covers.map(loadImage))).filter((i): i is HTMLImageElement => Boolean(i));
    const cols = imgs.length <= 3 ? imgs.length : 3;
    const cw = cols === 1 ? 360 : cols === 2 ? 300 : 260, ch = cw * 1.5, gap = 32;
    const rows = Math.ceil(imgs.length / cols);
    let top = Math.max(y + 60, H - 320 - rows * (ch + gap));
    if (top + rows * (ch + gap) > H - 260) top = y + 40;
    imgs.forEach((img, i) => {
      const r = Math.floor(i / cols), k = i % cols;
      const inRow = Math.min(cols, imgs.length - r * cols);
      const x0 = (W - (inRow * cw + (inRow - 1) * gap)) / 2;
      const x = x0 + k * (cw + gap), yy = top + r * (ch + gap);
      if (yy + ch > H - 240) return;
      ctx.save(); ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 36; ctx.shadowOffsetY = 14;
      ctx.fillStyle = "#111"; ctx.fillRect(x, yy, cw, ch); ctx.restore();
      cover(ctx, img, x, yy, cw, ch);
    });
  }

  ctx.fillStyle = c.ink; ctx.globalAlpha = 0.7; ctx.font = f(40);
  ctx.fillText(fit(ctx, c.foot, W - 140), W / 2, H - 150);
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
}
