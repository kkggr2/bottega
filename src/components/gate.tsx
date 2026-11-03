"use client";

import type { ReactNode } from "react";
import type { Profile } from "@/lib/types";
import { useAuth } from "./auth";
import { Onboard } from "./onboard";
import { SignIn } from "./sign-in";

/** Renders children only for a signed-in person with a username; otherwise the right step to get there. */
export function Gate({ children }: { children: (me: Profile) => ReactNode }) {
  const auth = useAuth();
  if (auth.status === "unconfigured") return <Setup />;
  if (auth.status === "loading") return <p className="loading">Opening the library…</p>;
  if (auth.status === "signedOut") return <SignIn />;
  if (auth.status === "needsUsername") return <Onboard />;
  return auth.status === "ready" ? <>{children(auth.profile)}</> : null;
}

function Setup() {
  return (
    <section className="onboard">
      <div>
        <p className="mono muted">One step left</p>
        <h1>Connect Bottega to Supabase.</h1>
      </div>
      <div className="panel stack">
        <p>Copy <code>.env.example</code> to <code>.env.local</code> and fill in your Supabase project URL and publishable key, then restart the dev server.</p>
        <p className="muted">The README walks through creating the project and running the database setup.</p>
      </div>
    </section>
  );
}
