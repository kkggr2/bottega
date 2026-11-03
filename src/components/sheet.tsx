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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
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
