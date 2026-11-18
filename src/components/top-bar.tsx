"use client";

import { useT } from "@/lib/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "./auth";

export function TopBar() {
  return (
    <header className="bar">
      <Link href="/" className="brand">
        <DoorMark />
        <b>Bottega</b>
      </Link>
      {/* The current path is only known at request time, so the nav streams in. */}
      <Suspense fallback={null}>
        <Nav />
      </Suspense>
    </header>
  );
}

function Nav() {
  const auth = useAuth();
  const pathname = usePathname();
  const t = useT();
  if (auth.status !== "ready") return null;
  const mine = `/r/${auth.profile.username}`;
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>{t("Library")}</Link>
      <Link href="/salon" aria-current={pathname.startsWith("/salon") ? "page" : undefined}>{t("Salon")}</Link>
      <Link href="/quiz" aria-current={pathname.startsWith("/quiz") ? "page" : undefined}>{t("Quiz")}</Link>
      <Link href={mine} aria-current={pathname === mine ? "page" : undefined}>{t("My room")}</Link>
      <button type="button" onClick={() => {
        if (auth.guest && !window.confirm(t("You're a guest: signing out loses your room and clubs. Add your email first to keep them. Sign out anyway?"))) return;
        void auth.signOut();
      }}>{t("Sign out")}</button>
    </nav>
  );
}

/** The door, slightly open, with warm light coming out: "step inside". */
function DoorMark() {
  return (
    <svg className="door-mark" viewBox="0 0 24 30" aria-hidden="true">
      <path d="M3 29V11a9 9 0 0 1 18 0v18" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6.5 28V12.5a5.5 5.5 0 0 1 5.5-5.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".55" />
      <path d="M12 7a5.5 5.5 0 0 1 5.5 5.5V28H12z" fill="var(--brass)" opacity=".9" />
      <path d="M12 7l-3.2 2.4V29.2L12 28z" fill="currentColor" />
      <circle cx="10.4" cy="18.5" r=".8" fill="var(--bg)" />
    </svg>
  );
}
