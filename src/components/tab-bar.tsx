"use client";

import { useT } from "@/lib/i18n";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { myThreads } from "@/lib/chat";
import { isNativeApp, tap } from "@/lib/native";
import { useAuth } from "./auth";

/*
 * The iPhone app's bottom bar, one tab per room of the house: the Library (friends' doors), the Salon
 * (tonight's rooms, clubs, messages), Add, the Quiz room, and your own room. Replaces the website's
 * top links in the app. "Add" opens the add sheet in your own room, from anywhere.
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
  const unread = useUnread(native && auth.status === "ready", pathname);
  const t = useT();
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
        <span>{t("Library")}</span>
      </Link>
      <Link href="/salon" aria-current={pathname.startsWith("/salon") || pathname.startsWith("/chat") || pathname.startsWith("/messages") || pathname.startsWith("/club") ? "page" : undefined} onClick={() => tap()}>
        <span className="tab-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" /><path d="M3.5 12.5a1.8 1.8 0 0 1 3.5 0V15h10v-2.5a1.8 1.8 0 0 1 3.5 0V18H3.5z" /><path d="M6 18v2M18 18v2" /></svg>
          {unread > 0 && <i className="tab-dot" aria-label={t("{n} unread", { n: unread })} />}
        </span>
        <span>{t("Salon")}</span>
      </Link>
      <button type="button" className="tab-add" onClick={add} aria-label={t("Add something to your room")}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <Link href="/quiz" aria-current={pathname.startsWith("/quiz") ? "page" : undefined} onClick={() => tap()}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="11" height="15" rx="2" transform="rotate(-8 9.5 12.5)" /><rect x="9" y="4" width="11" height="15" rx="2" transform="rotate(7 14.5 11.5)" /><path d="M14.2 9.5l1.6 2.6-1.6 2.6-1.6-2.6z" /></svg>
        <span>{t("Quiz")}</span>
      </Link>
      <Link href={mine} aria-current={pathname === mine ? "page" : undefined} onClick={() => tap()}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V9a6 6 0 0 1 12 0v12" /><path d="M3 21h18" /><circle cx="14.5" cy="14" r=".9" fill="currentColor" stroke="none" /></svg>
        <span>{t("My room")}</span>
      </Link>
    </nav>
  );
}

/** Unread private messages, for the dot on the Salon tab. Checked when you move between tabs. */
function useUnread(on: boolean, pathname: string): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    let live = true;
    myThreads().then((t) => { if (live) setN(t.reduce((sum, x) => sum + x.unread, 0)); }).catch(() => {});
    return () => { live = false; };
  }, [on, pathname]);
  return n;
}
