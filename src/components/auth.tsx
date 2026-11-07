"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isConfigured, supabase } from "@/lib/supabase";
import { trackOpen } from "@/lib/track";
import { forgetPushToken } from "@/lib/push";
import { clearWidget } from "@/lib/widget";
import type { Profile } from "@/lib/types";

type AuthState =
  | { status: "loading" | "unconfigured" | "signedOut"; userId: null; profile: null }
  | { status: "needsUsername"; userId: string; profile: null }
  | { status: "ready"; userId: string; profile: Profile };

type AuthContextValue = AuthState & {
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(
    isConfigured
      ? { status: "loading", userId: null, profile: null }
      : { status: "unconfigured", userId: null, profile: null },
  );

  const load = useCallback(async (session: Session | null) => {
    trackOpen(session?.user.id ?? null);
    if (!session) {
      setState({ status: "signedOut", userId: null, profile: null });
      return;
    }
    const { data } = await supabase()
      .from("profiles")
      .select("id, username")
      .eq("id", session.user.id)
      .maybeSingle();
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
  }, []);

  return <AuthContext.Provider value={{ ...state, refreshProfile, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
