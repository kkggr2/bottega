"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "./auth";

export function TopBar() {
  return (
    <header className="bar">
      <Link href="/" className="brand">
        <b>Bottega</b>
        <span className="mono">a library of friends</span>
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
  if (auth.status !== "ready") return null;
  const mine = `/r/${auth.profile.username}`;
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>Library</Link>
      <Link href={mine} aria-current={pathname === mine ? "page" : undefined}>My room</Link>
      <button type="button" onClick={() => auth.signOut()}>Sign out</button>
    </nav>
  );
}
