import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Help" };

export default function Support() {
  return (
    <article className="legal">
      <h1>Help</h1>
      <p>Write to <a href="mailto:hello@bottegarooms.com">hello@bottegarooms.com</a> and you&rsquo;ll hear back within a day or two.</p>

      <h2>I can&rsquo;t log in</h2>
      <p>Use <b>Forgot password?</b> or <b>Email me a code instead</b> on the log-in screen. Codes come from hello@bottegarooms.com; check your spam folder.</p>

      <h2>How do I add a friend?</h2>
      <p>Type their username in your library, or send them your room link: when they make a room from it, you get their friend request.</p>

      <h2>Who can see my room?</h2>
      <p>Open your room → <b>Customize room</b> → <b>Who can come in</b>: your friends, anyone with the link, or just you.</p>

      <h2>Report a room or block someone</h2>
      <p>Open their room and tap <b>⋯</b>. Reports are looked at within 24 hours. Blocking removes the friendship and closes your room to them.</p>

      <h2>Notifications and emails</h2>
      <p>The daily email can be turned off in your library or from any email. Phone notifications can be turned off in your iPhone&rsquo;s Settings → Notifications → Bottega.</p>

      <h2>Delete my account</h2>
      <p>At the bottom of your library, tap <b>Delete my account</b>. Everything is removed for good.</p>

      <p className="legal-links"><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/">Bottega</Link></p>
    </article>
  );
}
