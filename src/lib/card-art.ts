/* Lamp-lit house pieces for the share pictures (canvas): a gilded frame, a brass name plate, a picture rail. */

export const SANS = `-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`;

function gold(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): CanvasGradient {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "#7A5618");
  g.addColorStop(0.22, "#E9CB7C");
  g.addColorStop(0.46, "#A47A2D");
  g.addColorStop(0.7, "#F3DC9C");
  g.addColorStop(1, "#80601F");
  return g;
}

/**
 * A gilded frame with a cream mat around the rectangle (x, y, w, h), where the picture goes.
 * `border` is the gold, `mat` the cream between gold and picture.
 */
export function gildedFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, border = 22, mat = 14) {
  const ox = x - mat - border, oy = y - mat - border, ow = w + 2 * (mat + border), oh = h + 2 * (mat + border);
  ctx.save();
  ctx.shadowColor = "rgba(30,15,0,.45)"; ctx.shadowBlur = 44; ctx.shadowOffsetY = 20;
  ctx.fillStyle = gold(ctx, ox, oy, ow, oh);
  ctx.fillRect(ox, oy, ow, oh);
  ctx.restore();
  // A thin dark line inside the gold, then the mat.
  ctx.fillStyle = "rgba(60,40,10,.45)";
  ctx.fillRect(x - mat - 2, y - mat - 2, w + 2 * mat + 4, h + 2 * mat + 4);
  ctx.fillStyle = "#F3ECDC";
  ctx.fillRect(x - mat, y - mat, w + 2 * mat, h + 2 * mat);
  ctx.fillStyle = "rgba(60,40,10,.3)";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
}

/** A small brass plate with the text centred on (cx, top). Returns the plate's height. */
export function brassPlate(ctx: CanvasRenderingContext2D, text: string, cx: number, top: number, font: string, maxW: number): number {
  ctx.save();
  ctx.font = font;
  let s = text;
  while (s.length > 1 && ctx.measureText(s).width > maxW - 56) s = s.slice(0, -2) + "…";
  const tw = ctx.measureText(s).width;
  const pw = tw + 56, ph = parseInt(font.match(/(\d+)px/)?.[1] ?? "36", 10) + 30;
  const x = cx - pw / 2;
  const g = ctx.createLinearGradient(0, top, 0, top + ph);
  g.addColorStop(0, "#F2D892"); g.addColorStop(0.48, "#D6AF5E"); g.addColorStop(1, "#B98F3F");
  ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x, top, pw, ph, 5); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "rgba(255,250,225,.6)"; ctx.fillRect(x + 4, top + 2, pw - 8, 2);
  ctx.fillStyle = "#33240A";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(s, cx, top + ph / 2 + 2);
  ctx.restore();
  return ph;
}

/** The gold picture rail along the top of a wall. */
export function pictureRail(ctx: CanvasRenderingContext2D, y: number, width: number) {
  ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(0, y - 22, width, 22);
  ctx.fillStyle = gold(ctx, 0, y, width, 8); ctx.fillRect(0, y, width, 8);
  ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(0, y + 8, width, 3);
}
