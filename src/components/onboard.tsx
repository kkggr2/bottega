"use client";

import { useT } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { claimInvite, forgetClub, joinClub, pendingClub, pendingStartClub } from "@/lib/clubs";
import { befriend } from "@/lib/friends";
import { friendlyError, supabase } from "@/lib/supabase";
import { cameFrom, forgetCameFrom, currentVia, track } from "@/lib/track";
import { USERNAME } from "@/lib/themes";
import { useAuth } from "./auth";

export function Onboard() {
  const auth = useAuth();
  const t = useT();
  const { refreshProfile } = auth;
  const router = useRouter();
  // Someone who arrived through a friend's room starts with a friend request to them.
  const [from] = useState(cameFrom);
  const [addFrom, setAddFrom] = useState(true);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    if (!USERNAME.test(username)) {
      setError(t("Pick 3–20 lowercase letters, numbers or underscores."));
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase().rpc("claim_username", {
      p_username: username,
      // The name and walls start with good defaults; both change later from the room.
      p_room_name: "",
      p_theme: "oak",
    });
    if (error) {
      setBusy(false);
      setError(t(friendlyError(error, "Couldn't save your room. Try again.")));
      return;
    }
    const via = currentVia();
    track("room_claimed", { detail: via ? `via:${via}` : from ? "from_room" : "" });
    if (from && addFrom && auth.userId) {
      try {
        // Friends-only rooms hide their owner from visitors, so look them up by username now.
        const ownerId = from.id
          || (await supabase().from("profiles").select("id").eq("username", from.username).maybeSingle()).data?.id;
        if (ownerId && ownerId !== auth.userId) {
          const rel = await befriend(auth.userId, ownerId);
          track("friend_request", { room: ownerId, detail: `signup:${rel}` });
        }
      } catch {
        // The room still opens; they can add the friend from the library.
      }
    }
    // A club link opened before signing up (on this device, or in a browser just before installing the app).
    let landing: string | null = null;
    try {
      const here = pendingClub();
      const fromInstall = await claimInvite();
      const slug = here ?? fromInstall.club;
      if (slug && !(await joinClub(slug, here ? "link" : "app-install"))) {
        track("club_join", { detail: slug });
        landing = `/club/${slug}`;
      } else if (!from && fromInstall.inviter && auth.userId) {
        const { data } = await supabase().from("profiles").select("id").eq("username", fromInstall.inviter).maybeSingle();
        if (data?.id && data.id !== auth.userId) await befriend(auth.userId, data.id as string);
      }
    } catch {
      // Their room still opens; they can join from the link again.
    }
    // On the way to starting a club: back to naming it.
    if (!landing && pendingStartClub()) landing = "/start";
    forgetClub();
    forgetCameFrom();
    await refreshProfile();
    if (landing) router.push(landing);
  }

  return (
    <section className="onboard">
      <div>
        <h1>{t("There's an empty room with your name on it.")}</h1>
        <p className="lede">{t("Pick the username friends will type to find you. You can name the room and paint the walls once you're inside.")}</p>
      </div>
      <div className="panel">
        <form onSubmit={(e) => { e.preventDefault(); claim(); }}>
          <div className="field">
            <label htmlFor="ob-handle">{t("Username")}</label>
            <div className="at">
              <input id="ob-handle" type="text" enterKeyHint="done" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} maxLength={20}
                placeholder={t("yourname")} value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
            </div>
            <span className="hint">{t("3–20 lowercase letters, numbers or underscores. Friends find you with this, and it can't be changed later.")}</span>
          </div>
          {from && (
            <label className="check">
              <input type="checkbox" checked={addFrom} onChange={(e) => setAddFrom(e.target.checked)} />
              <span>{t("Send @{name} a friend request, so your rooms sit side by side", { name: from.username })}</span>
            </label>
          )}
          <p className="msg err" aria-live="polite">{error}</p>
          <div>
            <button className="btn" type="submit" disabled={busy}>{busy ? t("Opening…") : t("Open my room")}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
