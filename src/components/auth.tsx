"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isConfigured, supabase } from "@/lib/supabase";
import { trackOpen } from "@/lib/track";
import { forgetPushToken } from "@/lib/push";
import { clearWidget } from "@/lib/widget";
import { clearCache, forgetCache, readCache, writeCache } from "@/lib/remember";
import type { Profile } from "@/lib/types";

type AuthState =
  | { status: "loading" | "unconfigured" | "signedOut"; userId: null; profile: null }
  | { status: "needsUsername"; userId: string; profile: null }
  | { status: "ready"; userId: string; profile: Profile };

type AuthContextValue = AuthState & {
  /** Signed in as a guest (joined from a club link with just a name, no email yet). */
  guest: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState(false);
  const [state, setState] = useState<AuthState>(
    isConfigured
      ? { status: "loading", userId: null, profile: null }
      : { status: "unconfigured", userId: null, profile: null },
  );

  const load = useCallback(async (session: Session | null) => {
    setGuest(Boolean(session?.user.is_anonymous));
    trackOpen(session?.user.id ?? null);
    if (!session) {
      setState({ status: "signedOut", userId: null, profile: null });
      return;
    }
    // Who you are is remembered, so the app opens straight into your library and checks in the background.
    const key = `profile:${session.user.id}`;
    const known = readCache<Profile>(key);
    if (known) setState({ status: "ready", userId: session.user.id, profile: known });
    const { data, error } = await supabase()
      .from("profiles")
      .select("id, username")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error && known) return; // offline or a hiccup: keep going as who we know you are
    if (data) writeCache(key, data); else forgetCache(key);
    if (known && data && known.username === (data as Profile).username) return; // nothing changed
    setState(
      data
        ? { status: "ready", userId: session.user.id, profile: data as Profile }
        : { status: "needsUsername", userId: session.user.id, profile: null },
    );
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => load(data.session));
    // Supabase advises against awaiting other calls inside this callback, so defer the load.
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => load(session), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase().auth.getSession();
    await load(data.session);
  }, [load]);

  const signOut = useCallback(async () => {
    await forgetPushToken();
    await supabase().auth.signOut();
    clearWidget();
    clearCache();
  }, []);

  return <AuthContext.Provider value={{ ...state, guest, refreshProfile, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
