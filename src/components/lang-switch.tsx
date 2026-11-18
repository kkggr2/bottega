"use client";

import { setLang, useLang } from "@/lib/i18n";

/** Türkçe / English, saved on this device. */
export function LangSwitch() {
  const lang = useLang();
  return (
    <span className="lang-switch" role="group" aria-label="Language / Dil">
      <button type="button" className="linkish" aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
      <span aria-hidden="true">·</span>
      <button type="button" className="linkish" aria-pressed={lang === "tr"} onClick={() => setLang("tr")}>Türkçe</button>
    </span>
  );
}
