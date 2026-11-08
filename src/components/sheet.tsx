"use client";

import { useEffect, useRef, type FormEvent, type ReactNode } from "react";

/** A modal sheet. Escape or a click on the backdrop closes it. */
export function Sheet({
  onClose,
  onSubmit,
  label,
  children,
}: {
  onClose: () => void;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Remember what had focus, so closing the sheet returns you there (VoiceOver and keyboards).
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      // Keep Tab inside the sheet while it's open.
      if (e.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
      )].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, [onClose]);

  const body = onSubmit ? (
    <form className="sheet" onSubmit={(e) => { e.preventDefault(); onSubmit(e); }}>{children}</form>
  ) : (
    <div className="sheet">{children}</div>
  );

  return (
    <div
      ref={ref}
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {body}
    </div>
  );
}
