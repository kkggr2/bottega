import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <article className="legal">
      <p className="who">Last updated 8 November 2026</p>
      <h1>Terms</h1>
      <p>Bottega is run by Cagla Ece Azizoglu. By creating an account you agree to these terms and the <Link href="/privacy">privacy policy</Link>.</p>

      <h2>Your room is yours</h2>
      <p>
        What you add stays yours. You let Bottega store it and show it to the people you choose, only to run the service.
        Only upload images and sound you have the right to share.
      </p>

      <h2>No tolerance for abuse</h2>
      <p>Don&rsquo;t post or send anything that is:</p>
      <ul>
        <li>hateful, harassing, threatening or bullying</li>
        <li>sexually explicit, or involving anyone under 18 in any sexual way</li>
        <li>violent, or encouraging self-harm or illegal acts</li>
        <li>pretending to be someone else, spam, or someone else&rsquo;s private information</li>
        <li>someone else&rsquo;s copyrighted work that you don&rsquo;t have the right to share</li>
      </ul>
      <p>
        Anyone can <b>report</b> a room or <b>block</b> a person from the ⋯ button in their room. Reports are reviewed within
        24 hours. Content that breaks these rules is removed, and the accounts behind it can be closed.
      </p>

      <h2>Age</h2>
      <p>You need to be at least 16 to use Bottega.</p>

      <h2>The service</h2>
      <p>
        Bottega is offered as it is, and may change or pause. You can stop using it and delete your account any time.
        We may close accounts that break these terms. Nothing here limits rights you have under the law where you live.
      </p>

      <h2>Contact</h2>
      <p><a href="mailto:hello@bottegarooms.com">hello@bottegarooms.com</a></p>

      <p className="legal-links"><Link href="/privacy">Privacy</Link> · <Link href="/support">Help</Link> · <Link href="/">Bottega</Link></p>
    </article>
  );
}
