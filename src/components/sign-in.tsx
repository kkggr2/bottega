"use client";

import Link from "next/link";
import { useState } from "react";
import { isNativeApp } from "@/lib/native";
import { friendlyError, supabase } from "@/lib/supabase";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function send() {
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setMsg({ kind: "err", text: "Enter the email address you want to sign in with." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setMsg({ kind: "err", text: friendlyError(error, "Couldn't send the email. Try again.") });
    else setSentTo(address);
  }

  async function verify() {
    if (!sentTo || !/^\d{6,8}$/.test(code.trim())) {
      setMsg({ kind: "err", text: "Enter the code from the email." });
      return;
    }
    setBusy(true);
    const { error } = await supabase().auth.verifyOtp({ email: sentTo, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setMsg({ kind: "err", text: "That code didn't work. Check it, or send a new email." });
  }

  return (
    <section className="onboard">
      <div>
        <p className="mono muted">Everyone gets one room</p>
        <h1>Step into your friends&rsquo; taste.</h1>
        <p className="lede">
          Hang a film poster, tape up a poem, leave a record on the wall that plays when someone clicks it.
          Add friends by username and their rooms line your shelf.
        </p>
        <p style={{ marginTop: 20 }}><Link className="btn ghost" href="/example">Look around an example room</Link></p>
      </div>

      <div className="panel">
        {sentTo ? (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); verify(); }}>
            <p className="mono muted">Check your inbox</p>
            <p>
              {isNativeApp()
                ? <>We emailed <b>{sentTo}</b>. Type the code from that email here. (The link in it opens your browser, not the app.)</>
                : <>We sent a sign-in link to <b>{sentTo}</b>. Open it on this device, or type the code from the email.</>}
            </p>
            <div className="field">
              <label htmlFor="otp">Code</label>
              <input id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </div>
            <p className={`msg ${msg?.kind ?? ""}`} aria-live="polite">{msg?.text}</p>
            <div className="chips">
              <button className="btn" type="submit" disabled={busy}>Sign in</button>
              <button className="btn ghost" type="button" onClick={() => { setSentTo(null); setCode(""); setMsg(null); }}>
                Use a different email
              </button>
            </div>
          </form>
        ) : (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <p className="mono muted">Sign in or join</p>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <span className="hint">No password. We email you a link each time.</span>
            </div>
            <p className={`msg ${msg?.kind ?? ""}`} aria-live="polite">{msg?.text}</p>
            <div>
              <button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : isNativeApp() ? "Email me a code" : "Email me a link"}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
