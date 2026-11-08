import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <article className="legal">
      <p className="who">Last updated 8 November 2026</p>
      <h1>Privacy</h1>
      <p>
        Bottega is run by Cagla Ece Azizoglu. Questions or requests about your data:{" "}
        <a href="mailto:hello@bottegarooms.com">hello@bottegarooms.com</a>.
      </p>

      <h2>What Bottega keeps</h2>
      <ul>
        <li><b>Your account:</b> your email address and password (stored scrambled, never readable), and your username.</li>
        <li><b>Your room:</b> what you add (titles, your notes, links, images and sound clips you upload), your room&rsquo;s name and look, and what you leave on the turntable, in the TV or on the armchair.</li>
        <li><b>Your friends:</b> who you&rsquo;re friends with, requests, people you&rsquo;ve blocked, and reports you send.</li>
        <li><b>How Bottega is used:</b> simple events such as opening the app, viewing a room, adding something or sharing a link, with a random ID for your device and, when signed in, your account. We use these only to see whether Bottega works for people, never for advertising.</li>
        <li><b>Notifications:</b> if you allow them, your phone&rsquo;s notification address, and whether you want the daily email.</li>
        <li><b>On your device:</b> small settings like that random ID and which friends&rsquo; rooms you&rsquo;ve already seen.</li>
      </ul>

      <h2>Who can see your room</h2>
      <p>You choose in your room&rsquo;s settings: your friends, anyone with the link, or just you. Usernames are visible to signed-in people so friends can find each other.</p>

      <h2>Who helps run Bottega</h2>
      <ul>
        <li><b>Supabase</b> stores the database, sign-ins and uploaded files.</li>
        <li><b>Vercel</b> hosts the website and app pages.</li>
        <li><b>Resend</b> sends sign-in codes and the daily email.</li>
        <li><b>Apple</b> delivers iPhone notifications.</li>
        <li>When you search for a song, book or film, the search goes to <b>Apple Music</b>, <b>Open Library</b>, <b>TMDB</b> or <b>YouTube</b>, and covers are loaded from them.</li>
      </ul>
      <p>We don&rsquo;t sell your data, show ads, or track you across other apps and websites.</p>

      <h2>How long it&rsquo;s kept</h2>
      <p>
        Until you delete it. <b>Delete my account</b> at the bottom of your library removes your account, room, uploads,
        friends and settings for good. Usage events are kept only in a form no longer linked to you.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct, export or delete your data, or object to how it&rsquo;s used, by writing to{" "}
        <a href="mailto:hello@bottegarooms.com">hello@bottegarooms.com</a>. If you&rsquo;re in the EU or UK you can also
        complain to your data protection authority.
      </p>

      <h2>Age</h2>
      <p>Bottega is for people aged 16 and over.</p>

      <h2>Changes</h2>
      <p>If this changes in a way that matters, we&rsquo;ll say so in the app before it takes effect.</p>

      <p className="legal-links"><Link href="/terms">Terms</Link> · <Link href="/support">Help</Link> · <Link href="/">Bottega</Link></p>
    </article>
  );
}
