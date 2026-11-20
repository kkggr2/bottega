import { ImageResponse } from "next/og";
import { THEMES } from "./themes";
import type { ThemeKey } from "./types";

/*
 * The link-preview picture for a room (1200×630): what Instagram, WhatsApp, iMessage and bio pages show
 * when someone pastes a room link. Cream paper on the left, the room's wall with three covers in gilded
 * frames on the right. A room that isn't public shows only a door that says so.
 */

export const OG_SIZE = { width: 1200, height: 630 };

type Face = { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" | "italic" };
let faces: Promise<Face[]> | null = null;

/** Fraunces (upright 600, italic 400) and Inter 600, as TTF from Google Fonts, once per server. */
function loadFonts(): Promise<Face[]> {
  faces ??= (async () => {
    const css = await fetch("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,72,600;1,72,400&family=Inter:wght@600").then((r) => r.text());
    const blocks = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => m[1]);
    const out = await Promise.all(blocks.map(async (b) => {
      const name = b.match(/font-family:\s*'([^']+)'/)?.[1];
      const style = b.match(/font-style:\s*(\w+)/)?.[1] === "italic" ? "italic" : "normal";
      const weight = b.match(/font-weight:\s*(\d+)/)?.[1] === "600" ? 600 : 400;
      const url = b.match(/src:\s*url\(([^)]+\.ttf)\)/)?.[1];
      if (!name || !url) return null;
      return { name, style, weight, data: await fetch(url).then((r) => r.arrayBuffer()) } as Face;
    }));
    return out.filter((f): f is Face => Boolean(f));
  })().catch(() => { faces = null; return []; });
  return faces;
}

const INK = "#2A1D13", MUTED = "#7A6A58", GOLD = "#9C7630", GREEN = "#4F6138";
const GILT = "linear-gradient(135deg, #7A5618 0%, #E9CB7C 22%, #A47A2D 46%, #F3DC9C 70%, #80601F 100%)";
const SANS = "Inter";

export type OgRoom = { name: string; tagline: string | null; theme: string } | null;

export async function roomPreview(username: string, room: OgRoom, covers: string[]): Promise<ImageResponse> {
  const th = THEMES[(room?.theme ?? "oak") as ThemeKey] ?? THEMES.oak;
  const show = room ? covers.slice(0, 3) : [];
  const one = show.length === 1;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#F3EBDA", fontFamily: "Fraunces", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", background: "radial-gradient(90% 80% at 30% -10%, #FCF3DE 0%, rgba(252,243,222,0) 70%)" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 0 60px 72px", width: show.length ? 640 : 1100 }}>
          <div style={{ display: "flex", fontSize: 42, fontStyle: "italic", fontWeight: 400, color: INK }}>Bottega</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: SANS, fontWeight: 600, fontSize: 20, letterSpacing: 5, color: GOLD }}>
              {`@${username.toUpperCase()}'S ROOM`}
            </div>
            <div style={{ display: "flex", fontSize: room && room.name.length > 20 ? 60 : 74, fontWeight: 600, color: INK, lineHeight: 1.05, marginTop: 14 }}>
              {room ? room.name : `@${username}'s room is for friends.`}
            </div>
            <div style={{ display: "flex", fontSize: 30, fontStyle: "italic", fontWeight: 400, color: MUTED, marginTop: 18, lineHeight: 1.3 }}>
              {room ? (room.tagline || "Films, books and records, hung like a room.") : "Make a room of your own, and swap keys."}
            </div>
          </div>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", background: GREEN, color: "#FBF6EC", borderRadius: 999, padding: "16px 34px", fontSize: 26, fontFamily: SANS, fontWeight: 600 }}>
              {room ? "Step inside  →" : "bottegarooms.com"}
            </div>
          </div>
        </div>
        {show.length > 0 && (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", background: th.wall, margin: "44px 44px 44px 0", borderRadius: 24, borderTop: "10px solid #C9A458" }}>
            {show.map((src, i) => (
              <div key={src} style={{
                display: "flex", padding: 9, background: GILT, marginLeft: i ? -34 : 0, marginTop: one ? 0 : i === 1 ? -70 : 50,
                transform: one ? "none" : `rotate(${[-4, 2, 5][i]}deg)`, boxShadow: "0 18px 30px rgba(30,15,0,.45)",
              }}>
                <div style={{ display: "flex", padding: 6, background: "#F3ECDC" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- drawn into the preview picture */}
                  <img src={src} alt="" width={one ? 230 : 150} height={one ? 345 : 225} style={{ objectFit: "cover" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts(), headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
