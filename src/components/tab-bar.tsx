"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { isNativeApp, tap } from "@/lib/native";
import { useAuth } from "./auth";

/*
 * The iPhone app's bottom bar: Library, My room, Add. Replaces the website's top links in the app.
 * "Add" opens the add sheet in your own room, from anywhere.
 */

export const ADD_EVENT = "bottega:add";
const ADD_FLAG = "bottega.openAdd";

/** Your room calls this on load: was "Add" tapped somewhere else on the way here? */
export function takeAddRequest(): boolean {
  try {
    const v = sessionStorage.getItem(ADD_FLAG) === "1";
    sessionStorage.removeItem(ADD_FLAG);
    return v;
  } catch {
    return false;
  }
}

const subscribe = () => () => {};

export function TabBar() {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const native = useSyncExternalStore(subscribe, isNativeApp, () => false);
  if (!native || auth.status !== "ready") return null;

  const mine = `/r/${auth.profile.username}`;
  const add = () => {
    tap();
    if (pathname === mine) {
      window.dispatchEvent(new Event(ADD_EVENT));
    } else {
      try { sessionStorage.setItem(ADD_FLAG, "1"); } catch {}
      router.push(mine);
    }
  };

  return (
    <nav className="tabbar" aria-label="Main">
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined} onClick={() => tap()}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v16M8.5 6v14M13 5v15M16.5 7.2l3.6 12.3" /><path d="M3 20h18" /></svg>
        <span>Library</span>
      </Link>
      <button type="button" className="tab-add" onClick={add} aria-label="Add something to your room">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <Link href={mine} aria-current={pathname === mine ? "page" : undefined} onClick={() => tap()}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V9a6 6 0 0 1 12 0v12" /><path d="M3 21h18" /><circle cx="14.5" cy="14" r=".9" fill="currentColor" stroke="none" /></svg>
        <span>My room</span>
      </Link>
    </nav>
  );
}
