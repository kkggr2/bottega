"use client";

import { useState } from "react";
import { friendlyError, supabase } from "@/lib/supabase";
import { USERNAME } from "@/lib/themes";
import type { ThemeKey } from "@/lib/types";
import { useAuth } from "./auth";
import { ThemeSwatches } from "./theme-swatches";

export function Onboard() {
  const { refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [roomName, setRoomName] = useState("");
  const [theme, setTheme] = useState<ThemeKey>("oak");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    if (!USERNAME.test(username)) {
      setError("Pick 3–20 lowercase letters, numbers or underscores.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase().rpc("claim_username", {
      p_username: username,
      p_room_name: roomName,
      p_theme: theme,
    });
    if (error) {
      setBusy(false);
      setError(friendlyError(error, "Couldn't save your room. Try again."));
      return;
    }
    await refreshProfile();
  }

  return (
    <section className="onboard">
      <div>
        <p className="mono muted">Welcome in</p>
        <h1>There&rsquo;s an empty room with your name on it.</h1>
        <p className="lede">Pick the username your friends will type to find you, then fill the walls with what you love.</p>
      </div>
      <div className="panel">
        <form onSubmit={(e) => { e.preventDefault(); claim(); }}>
          <div className="field">
            <label htmlFor="ob-handle">Username</label>
            <div className="at">
              <input id="ob-handle" type="text" autoComplete="off" spellCheck={false} maxLength={20}
                placeholder="yourname" value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
            </div>
            <span className="hint">3–20 lowercase letters, numbers or underscores. Friends find you with this, and it can&rsquo;t be changed later.</span>
          </div>
          <div className="field">
            <label htmlFor="ob-name">Name your room</label>
            <input id="ob-name" type="text" maxLength={48} placeholder="The Late Show" value={roomName}
              onChange={(e) => setRoomName(e.target.value)} />
          </div>
          <div className="field">
            <span className="label">Walls</span>
            <ThemeSwatches value={theme} onChange={setTheme} />
          </div>
          <p className="msg err" aria-live="polite">{error}</p>
          <div>
            <button className="btn" type="submit" disabled={busy}>{busy ? "Unlocking…" : "Get my key"}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
