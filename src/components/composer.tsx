"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { MESSAGE_MAX } from "@/lib/chat";
import { useT } from "@/lib/i18n";

/*
 * The box you write a message in (club chat, tonight's rooms, private messages). It grows with what you write,
 * up to about seven lines, then scrolls. On a phone Return starts a new line and Send sends, as in any messaging
 * app; on a computer Enter sends and Shift+Enter starts a new line. Near the limit it says how much room is left.
 */

const TOUCH = "(pointer: coarse)";
function subscribe(onChange: () => void) {
  const m = window.matchMedia(TOUCH);
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}
const useTouch = () => useSyncExternalStore(subscribe, () => window.matchMedia(TOUCH).matches, () => false);

export function Composer({ value, onChange, onSend, placeholder, busy }: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  busy: boolean;
}) {
  const t = useT();
  const touch = useTouch();
  const box = useRef<HTMLTextAreaElement>(null);

  // Fit the box to its text (the CSS caps the height, then it scrolls). Again once the fonts have loaded and
  // whenever the window changes size (a phone turned sideways), since both change how many lines the text takes.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; };
    fit();
    void document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [value]);

  const left = MESSAGE_MAX - value.length;

  return (
    <form className="chat-send" onSubmit={(e) => { e.preventDefault(); onSend(); }}>
      <textarea ref={box} rows={1} value={value} maxLength={MESSAGE_MAX} placeholder={placeholder} aria-label={t("Message")}
        enterKeyHint={touch ? "enter" : "send"}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (touch || e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
          e.preventDefault();
          onSend();
        }} />
      <button className="btn" type="submit" disabled={busy || !value.trim()}>{t("Send")}</button>
      {left <= 200 && <p className="chat-left" aria-live="polite">{left === 1 ? t("1 character left") : t("{n} characters left", { n: left })}</p>}
    </form>
  );
}
