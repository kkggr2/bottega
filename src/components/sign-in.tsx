"use client";

import { useEffect, useRef, useState } from "react";
import { isNativeApp } from "@/lib/native";
import { ExampleRoom } from "./example-room";
import { friendlyError, supabase } from "@/lib/supabase";
import { cameFrom, track } from "@/lib/track";

/*
 * Accounts use an email and a password.
 * - Create account: email + password, then the 6-digit code from the confirmation email.
 * - Log in: email + password.
 * - Backups: "Email me a code instead" and "Forgot password" (code + new password).
 */

type Mode = "login" | "create" | "code" | "forgot";
type Pending = { email: string; kind: "signup" | "code" | "recovery" };

const MIN_PASSWORD = 8;
const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export function SignIn() {
  // Most people here are new, so the form starts on "Create account".
  const [mode, setMode] = useState<Mode>("create");
  const [from] = useState(cameFrom);
  const joinRef = useRef<HTMLDivElement>(null);
  useEffect(() => track("landing", { detail: from ? "from_room" : "" }), [from]);

  function goToForm(next: Mode) {
    switchTo(next);
    joinRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => document.getElementById("email")?.focus({ preventScroll: true }), 400);
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const err = (text: string) => setMsg({ kind: "err", text });

  function switchTo(next: Mode) {
    setMode(next);
    setPending(null);
    setCode("");
    setPassword("");
    setMsg(null);
  }

  function checked(): string | null {
    const address = email.trim();
    if (!looksLikeEmail(address)) {
      err("Enter your email address.");
      return null;
    }
    return address;
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setMsg(null);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  }

  const logIn = () => run(async () => {
    const address = checked();
    if (!address) return;
    if (!password) return err("Enter your password.");
    const { error } = await supabase().auth.signInWithPassword({ email: address, password });
    if (!error) return;
    if (/not confirmed/i.test(error.message)) {
      await supabase().auth.resend({ type: "signup", email: address, options: { emailRedirectTo: window.location.origin } });
      setPending({ email: address, kind: "signup" });
      setMsg({ kind: "ok", text: "Your email isn't confirmed yet. We sent a new code." });
    } else if (/invalid login credentials/i.test(error.message)) {
      err("That email and password don't match. Try again, or use “Forgot password”.");
    } else {
      err(friendlyError(error, "Couldn't log in. Try again."));
    }
  });

  const createAccount = () => run(async () => {
    const address = checked();
    if (!address) return;
    if (password.length < MIN_PASSWORD) return err(`Choose a password with at least ${MIN_PASSWORD} characters.`);
    const { data, error } = await supabase().auth.signUp({
      email: address,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      if (/already registered|already exists/i.test(error.message)) {
        return err("There's already an account with this email. Log in instead.");
      }
      return err(friendlyError(error, "Couldn't create the account. Try again."));
    }
    // Supabase hides whether an email is taken: an existing account comes back with no identities.
    if (data.user && data.user.identities?.length === 0) {
      return err("There's already an account with this email. Log in instead, or use “Forgot password”.");
    }
    track("account_created");
    if (data.session) return; // Email confirmation is off: already signed in.
    setPending({ email: address, kind: "signup" });
  });

  const emailCode = () => run(async () => {
    const address = checked();
    if (!address) return;
    const { error } = await supabase().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    });
    if (error) {
      if (/signups not allowed|not found|otp_disabled/i.test(error.message)) {
        return err("There's no account with this email yet. Create one first.");
      }
      return err(friendlyError(error, "Couldn't send the email. Try again."));
    }
    setPending({ email: address, kind: "code" });
  });

  const sendReset = () => run(async () => {
    const address = checked();
    if (!address) return;
    const { error } = await supabase().auth.resetPasswordForEmail(address, { redirectTo: window.location.origin });
    if (error) return err(friendlyError(error, "Couldn't send the email. Try again."));
    setPending({ email: address, kind: "recovery" });
  });

  const verify = () => run(async () => {
    if (!pending) return;
    const token = code.trim();
    if (!/^\d{6,8}$/.test(token)) return err("Enter the code from the email.");
    if (pending.kind === "recovery" && password.length < MIN_PASSWORD) {
      return err(`Choose a new password with at least ${MIN_PASSWORD} characters.`);
    }
    const { error } = await supabase().auth.verifyOtp({
      email: pending.email,
      token,
      type: pending.kind === "recovery" ? "recovery" : "email",
    });
    if (error) return err("That code didn't work. Check it, or ask for a new email.");
    if (pending.kind === "recovery") {
      const { error: pwError } = await supabase().auth.updateUser({ password });
      if (pwError) err(friendlyError(pwError, "Signed in, but the new password didn't save. Try “Forgot password” again later."));
    }
    // Signing in swaps this screen for the app.
  });

  const resend = () => run(async () => {
    if (!pending) return;
    const options = { emailRedirectTo: window.location.origin };
    const { error } =
      pending.kind === "signup" ? await supabase().auth.resend({ type: "signup", email: pending.email, options })
      : pending.kind === "recovery" ? await supabase().auth.resetPasswordForEmail(pending.email, { redirectTo: window.location.origin })
      : await supabase().auth.signInWithOtp({ email: pending.email, options: { ...options, shouldCreateUser: false } });
    if (error) err(friendlyError(error, "Couldn't send another email. Wait a minute and try again."));
    else setMsg({ kind: "ok", text: "Sent. Check your inbox (and spam)." });
  });

  const intro: Record<Pending["kind"], string> = {
    signup: "Type the code from the email to confirm your account.",
    code: "Type the code from the email to log in.",
    recovery: "Type the code from the email and choose a new password.",
  };

  return (
    <div className="landing">
      <section className="landing-hero">
        <h1>Step into your friends&rsquo; taste.</h1>
        <p className="lede">Fill one room with what you love. Then visit theirs.</p>
        <div className="chips">
          <button className="btn" type="button" onClick={() => goToForm("create")}>Make my own room</button>
          <button className="btn ghost" type="button" onClick={() => goToForm("login")}>Log in</button>
        </div>
      </section>

      <section className="landing-room" aria-label="An example room you can try">
        <p className="try">This room is real. Tap the records, or a DVD.</p>
        <ExampleRoom embedded onMakeYours={() => goToForm("create")} />
      </section>

      <section className="onboard" id="join" ref={joinRef}>
        <div>
          <h2 className="join-title">{mode === "create" ? "Five things open your door." : "Your room is waiting."}</h2>
          <p className="lede">
            {from
              ? <>You came from <b>@{from.username}</b>&rsquo;s room. Make yours and we&rsquo;ll send them a friend request so your rooms sit side by side.</>
              : mode === "create"
                ? "Pick a username, hang five things you love, and send the link to a friend. Bring in Letterboxd films or Goodreads books in one tap."
                : "Log in with your email and password, or have a code sent to you."}
          </p>
        </div>

      <div className="panel">
        {pending ? (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); verify(); }}>
            <h2 className="panel-title">Check your inbox</h2>
            <p>
              We emailed <b>{pending.email}</b>. {intro[pending.kind]}
              {!isNativeApp() && pending.kind !== "recovery" && " You can also open the link in it on this device."}
            </p>
            <div className="field">
              <label htmlFor="otp">Code</label>
              <input id="otp" type="text" enterKeyHint="done" inputMode="numeric" autoComplete="one-time-code" maxLength={8}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </div>
            {pending.kind === "recovery" && (
              <div className="field">
                <label htmlFor="new-password">New password</label>
                <input id="new-password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD}
                  value={password} onChange={(e) => setPassword(e.target.value)} />
                <span className="hint">At least {MIN_PASSWORD} characters.</span>
              </div>
            )}
            <p className={`msg ${msg?.kind ?? ""}`} aria-live="polite">{msg?.text}</p>
            <div className="chips">
              <button className="btn" type="submit" disabled={busy}>
                {pending.kind === "signup" ? "Confirm" : pending.kind === "recovery" ? "Save and log in" : "Log in"}
              </button>
              <button className="btn ghost" type="button" disabled={busy} onClick={resend}>Send again</button>
            </div>
            <button className="linkish" type="button" onClick={() => switchTo(mode)}>Use a different email</button>
          </form>
        ) : (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              ({ login: logIn, create: createAccount, code: emailCode, forgot: sendReset })[mode]();
            }}
          >
            <div className="chips" role="group" aria-label="Account">
              <button type="button" className="chip" aria-pressed={mode === "create"} onClick={() => switchTo("create")}>Create account</button>
              <button type="button" className="chip" aria-pressed={mode !== "create"} onClick={() => switchTo("login")}>Log in</button>
            </div>

            {mode === "forgot" && <p>Enter your email and we&rsquo;ll send a code to choose a new password.</p>}
            {mode === "code" && <p>Enter your email and we&rsquo;ll send a code to log in without your password.</p>}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" enterKeyHint={mode === "login" || mode === "create" ? "next" : "send"} autoCapitalize="none" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            {(mode === "login" || mode === "create") && (
              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" enterKeyHint="go" minLength={mode === "create" ? MIN_PASSWORD : undefined}
                  autoComplete={mode === "create" ? "new-password" : "current-password"}
                  value={password} onChange={(e) => setPassword(e.target.value)} />
                {mode === "create" && <span className="hint">At least {MIN_PASSWORD} characters. We&rsquo;ll email a code to confirm it&rsquo;s you.</span>}
              </div>
            )}

            <p className={`msg ${msg?.kind ?? ""}`} aria-live="polite">{msg?.text}</p>
            <div>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "One moment…"
                  : { login: "Log in", create: "Create account", code: "Email me a code", forgot: "Email me a reset code" }[mode]}
              </button>
            </div>

            {mode === "create" && (
              <p className="hint">By creating an account you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy policy</a>. No hateful or abusive content.</p>
            )}
            {mode === "login" && (
              <div className="chips">
                <button className="linkish" type="button" onClick={() => switchTo("forgot")}>Forgot password?</button>
                <span className="muted" aria-hidden>·</span>
                <button className="linkish" type="button" onClick={() => switchTo("code")}>Email me a code instead</button>
              </div>
            )}
            {(mode === "code" || mode === "forgot") && (
              <button className="linkish" type="button" onClick={() => switchTo("login")}>Back to log in with password</button>
            )}
          </form>
        )}
      </div>
      </section>
      <footer className="lib-foot">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/support">Help</a>
      </footer>
    </div>
  );
}
