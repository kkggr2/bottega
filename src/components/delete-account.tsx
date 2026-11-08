"use client";

import { useState } from "react";
import { deleteAccount } from "@/lib/safety";
import { useAuth } from "./auth";
import { Sheet } from "./sheet";

/** Delete your account for good. Typing your username confirms it. */
export function DeleteAccount({ username }: { username: string }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    if (typed.trim().replace(/^@/, "").toLowerCase() !== username) return setMsg(`Type ${username} to confirm.`);
    setBusy(true);
    const err = await deleteAccount();
    if (err) { setBusy(false); return setMsg(err); }
    await auth.signOut();
  }

  return (
    <>
      <button className="linkish muted" type="button" onClick={() => setOpen(true)}>Delete my account</button>
      {open && (
        <Sheet onClose={() => setOpen(false)} label="Delete your account">
          <h2>Delete your account?</h2>
          <p>Your room, everything in it, your friends list and your settings are deleted for good. This can&rsquo;t be undone.</p>
          <div className="field">
            <label htmlFor="del-confirm">Type <b>{username}</b> to confirm</label>
            <input id="del-confirm" type="text" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              value={typed} onChange={(e) => { setTyped(e.target.value); setMsg(null); }} />
          </div>
          <p className="msg err" aria-live="polite">{msg}</p>
          <div className="row">
            <button className="btn ghost" type="button" onClick={() => setOpen(false)}>Keep my account</button>
            <button className="btn danger-solid" type="button" disabled={busy} onClick={go}>{busy ? "Deleting…" : "Delete for good"}</button>
          </div>
        </Sheet>
      )}
    </>
  );
}
