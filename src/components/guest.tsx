"use client";

import { useState } from "react";
import { befriendWhoBroughtMe, confirmSave, sendSaveCode } from "@/lib/guest";
import { cameFrom } from "@/lib/track";
import { useT } from "@/lib/i18n";
import { useAuth } from "./auth";
import { Sheet } from "./sheet";

const MIN_PASSWORD = 8;

/** A quiet note for guests, with the way to keep their account. */
export function GuestNote({ why = "to keep your room and scores, and to write in the chat" }: { why?: string }) {
  const { guest } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!guest) return null;
  return (
    <div className="guest-note">
      <p>{t("You're here as a guest. Add your email {why}.", { why: t(why) })}</p>
      <button className="btn small" type="button" onClick={() => setOpen(true)}>{t("Add my email")}</button>
      {open && <SaveAccountSheet onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Where a guest would type (chat, letters): a button to add their email instead. */
export function GuestCantWrite() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="guest-write">
      <span className="muted">{t("Guests can read along. Add your email to write here.")}</span>
      <button className="btn small" type="button" onClick={() => setOpen(true)}>{t("Add my email")}</button>
      {open && <SaveAccountSheet onClose={() => setOpen(false)} />}
    </div>
  );
}

export function SaveAccountSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { userId } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (!sent) {
      const address = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(address)) return setError(t("Enter your email address."));
      if (password.length < MIN_PASSWORD) return setError(t("Choose a password with at least {n} characters.", { n: MIN_PASSWORD }));
      setBusy(true);
      const err = await sendSaveCode(address);
      setBusy(false);
      if (err) return setError(t(err));
      setEmail(address);
      setSent(true);
      return;
    }
    if (!/^\d{6,8}$/.test(code.trim())) return setError(t("Enter the code from the email."));
    setBusy(true);
    const err = await confirmSave(email, code, password);
    if (err) { setBusy(false); return setError(t(err)); }
    // Now they can have friends: the person whose room brought them gets a friend request.
    if (userId) await befriendWhoBroughtMe(userId);
    setBusy(false);
    setDone(true);
  }

  if (done) {
    return (
      <Sheet onClose={onClose} label={t("Your account is saved")}>
        <h2>{t("You're all set.")}</h2>
        <p className="muted">{t("Your room, clubs and scores are yours to keep. Next time, log in with {email}.", { email })}</p>
        <div className="row"><button className="btn" type="button" onClick={onClose}>{t("Done")}</button></div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} onSubmit={(e) => { e.preventDefault(); void submit(); }} label={t("Keep your account")}>
      <h2>{t("Keep your account")}</h2>
      <p className="muted">{t("Your room, clubs and quiz scores stay just as they are.")}</p>
      {!sent ? (
        <>
          <div className="field">
            <label htmlFor="save-email">{t("Email")}</label>
            <input id="save-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="save-pw">{t("Password")}</label>
            <input id="save-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <span className="hint">{t("At least {n} characters.", { n: MIN_PASSWORD })}</span>
          </div>
        </>
      ) : (
        <div className="field">
          <label htmlFor="save-code">{t("Code from the email")}</label>
          <input id="save-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <span className="hint">{t("We sent it to {email}. Check spam too.", { email })}</span>
        </div>
      )}
      <p className="msg err" aria-live="polite">{error}</p>
      <div className="row">
        <button className="btn ghost" type="button" onClick={onClose}>{t("Not now")}</button>
        <button className="btn" type="submit" disabled={busy}>{busy ? t("One moment…") : sent ? t("Save my account") : t("Send the code")}</button>
      </div>
    </Sheet>
  );
}

/**
 * In a guest's own room once they've hung a few things: keep it by adding an email.
 * (Guests start with just a name from "Make my own room"; see startAsGuest in lib/guest.ts.)
 */
export function KeepRoomCard({ pieces }: { pieces: number }) {
  const { guest } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [from] = useState(cameFrom);
  if (!guest || pieces < 3) return null;
  return (
    <section className="keep-room" aria-label={t("Keep your room")}>
      <p className="smallcaps">{t("Keep your room")}</p>
      <h2>{t("You've hung {n} things. Don't lose them.", { n: pieces })}</h2>
      <p className="muted">
        {t("You're here as a guest: if you log out or delete the app, this room is gone. Add your email and password to keep it, and to add friends.")}
        {from && ` ${t("We'll also send @{name} a friend request, so your rooms sit side by side.", { name: from.username })}`}
      </p>
      <button className="btn big" type="button" onClick={() => setOpen(true)}>{t("Keep my room")}</button>
      {open && <SaveAccountSheet onClose={() => setOpen(false)} />}
    </section>
  );
}
