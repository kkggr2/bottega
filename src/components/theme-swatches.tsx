import type { CSSProperties } from "react";
import { THEMES } from "@/lib/themes";
import type { ThemeKey } from "@/lib/types";

export function ThemeSwatches({ value, onChange }: { value: ThemeKey; onChange: (key: ThemeKey) => void }) {
  return (
    <div className="swatches" role="group" aria-label="Room colors">
      {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
        const t = THEMES[key];
        return (
          <button
            key={key}
            type="button"
            className="swatch"
            aria-pressed={value === key}
            style={{ "--sw-wall": t.wall, "--sw-floor": t.floor, "--sw-accent": t.accent } as CSSProperties}
            onClick={() => onChange(key)}
          >
            <i />
            {t.name}
          </button>
        );
      })}
    </div>
  );
}
