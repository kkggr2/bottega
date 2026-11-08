"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { blockPerson, reportRoom } from "@/lib/safety";
import { Sheet } from "./sheet";

/** On someone else's room: report it, or block the person. */
export function SafetySheet({ meId, ownerId, username, onClose }: {
  meId: string;
  ownerId: string;
  username: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"menu" | "report" | "block" | "done">("menu");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function report() {
    if (!reason.trim()) return setMsg("Say what's wrong in a few words.");
    setBusy(true);
    const err = await reportRoom(ownerId, reason);
    setBusy(false);
    if (err) return setMsg(err);
    setMode("done");
  }

  async function block() {
    setBusy(true);
    const err = await blockPerson(meId, ownerId);
    setBusy(false);
    if (err) return setMsg(err);
    onClose();
    router.push("/");
  }

  return (
    <Sheet onClose={onClose} label={`@${username}'s room`}>
      {mode === "menu" && (
        <>
          <h2>@{username}&rsquo;s room</h2>
          <div className="safety-options">
            <button className="btn ghost" type="button" onClick={() => setMode("report")}>Report this room</button>
            <button className="btn ghost danger-text" type="button" onClick={() => setMode("block")}>Block @{username}</button>
          </div>
          <div className="row"><button className="btn" type="button" onClick={onClose}>Close</button></div>
        </>
      )}
      {mode === "report" && (
        <>
          <h2>Report this room</h2>
          <div className="field">
            <label htmlFor="report-why">What&rsquo;s wrong?</label>
            <textarea id="report-why" rows={3} maxLength={500} value={reason}
              placeholder="Something offensive, someone pretending to be someone else, spam…"
              onChange={(e) => { setReason(e.target.value); setMsg(null); }} />
            <span className="hint">We look at every report within a day. @{username} won&rsquo;t see who reported.</span>
          </div>
          <p className="msg err" aria-live="polite">{msg}</p>
          <div className="row">
            <button className="btn ghost" type="button" onClick={() => setMode("menu")}>Back</button>
            <button className="btn" type="button" disabled={busy} onClick={report}>{busy ? "Sending…" : "Send report"}</button>
          </div>
        </>
      )}
      {mode === "block" && (
        <>
          <h2>Block @{username}?</h2>
          <p>You won&rsquo;t be friends anymore, they can&rsquo;t see your room or send you requests, and their room leaves your shelf. They aren&rsquo;t told.</p>
          <p className="msg err" aria-live="polite">{msg}</p>
          <div className="row">
            <button className="btn ghost" type="button" onClick={() => setMode("menu")}>Back</button>
            <button className="btn danger-solid" type="button" disabled={busy} onClick={block}>{busy ? "Blocking…" : `Block @${username}`}</button>
          </div>
        </>
      )}
      {mode === "done" && (
        <>
          <h2>Thanks for telling us.</h2>
          <p>We&rsquo;ll look at it within a day. If you don&rsquo;t want to see @{username}&rsquo;s room again, you can block them too.</p>
          <div className="row">
            <button className="btn ghost danger-text" type="button" onClick={() => setMode("block")}>Block @{username}</button>
            <button className="btn" type="button" onClick={onClose}>Done</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
