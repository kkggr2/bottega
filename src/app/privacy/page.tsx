import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <article className="legal">
      <p className="who">Last updated 25 November 2026</p>
      <h1>Privacy</h1>
      <p>
        Bottega is run by Cagla Ece Azizoglu. Questions or requests about your data:{" "}
        <a href="mailto:hello@bottegarooms.com">hello@bottegarooms.com</a>.
      </p>
      <p>
        This page also covers <b>Margins</b>, Bottega&rsquo;s app for watching TV with friends. It uses the same account.
      </p>

      <h2>What Bottega keeps</h2>
      <ul>
        <li><b>Your account:</b> your email address, a password if you set one (stored scrambled, never readable), and your username. If you join a club as a guest, just the name you choose.</li>
        <li><b>Your room:</b> what you add (titles, your notes, links, images and sound clips you upload), your room&rsquo;s name and look, and what you leave on the turntable, in the TV or on the armchair.</li>
        <li><b>Your friends:</b> who you&rsquo;re friends with, requests, people you&rsquo;ve blocked, and reports you send.</li>
        <li><b>Messages:</b> what you write in tonight&rsquo;s rooms (seen by others with the same artist, director or author on, and deleted after two days) and your private messages (seen only by you and the person you write to, kept until one of you deletes them or the account). Your daily quiz scores are shown on that day&rsquo;s high score table.</li>
        <li><b>How Bottega is used:</b> simple events such as opening the app, viewing a room, adding something or sharing a link, with a random ID for your device and, when signed in, your account. We use these only to see whether Bottega works for people, never for advertising.</li>
        <li><b>Notifications:</b> if you allow them, your device&rsquo;s notification address, and which emails you want (the daily email, club emails).</li>
        <li><b>Invites:</b> when you open a club or room link in a browser, we keep a scrambled (hashed) form of your network address for one hour, so that if you install the app and sign up within that hour, the invite still reaches you. It&rsquo;s deleted after the hour and can&rsquo;t be turned back into your address.</li>
        <li><b>On your device:</b> small settings like that random ID and which friends&rsquo; rooms you&rsquo;ve already seen.</li>
      </ul>

      <h2>Clubs</h2>
      <ul>
        <li><b>What you share in a club:</b> the clubs you join and when, and what you add there: chat messages, chapter notes, meeting replies, votes, reading progress, quiz scores, and film ratings with any line you write. Only the club&rsquo;s members see them. Chat messages are deleted after three months.</li>
        <li><b>Club emails:</b> if you&rsquo;re in a club and don&rsquo;t get notifications, we email you a reminder the day before a meeting and a short letter on Sundays. Every email has a one-click stop.</li>
        <li><b>Your town (optional):</b> if you tell us, it&rsquo;s used only to suggest clubs that meet there. Nobody else sees it. You can remove it in Settings.</li>
        <li><b>Club suggestions:</b> when a club&rsquo;s hosts choose to let people find it, we compare the films, books and records in your room with the club&rsquo;s shelf, and may suggest that club to you with the reason (&ldquo;You both have&nbsp;&hellip;&rdquo;). Hosts see how many people match, never who. Rooms set to &ldquo;Just me&rdquo; are never used.</li>
      </ul>

      <h2>Only if you switch them on</h2>
      <ul>
        <li><b>Taste Twins:</b> others who switched it on too can see your username and what&rsquo;s in your room (titles, makers, covers), never your notes or messages.</li>
        <li><b>Letterboxd import:</b> we read your public Letterboxd diary at that moment to show you your films. We don&rsquo;t keep your Letterboxd name.</li>
      </ul>

      <h2>Margins</h2>
      <ul>
        <li><b>What you watch:</b> the shows and episodes you watch in Margins, and how far you got.</li>
        <li><b>Comments and likes:</b> your comments are seen by others who watch the same episode, at the second you wrote them.</li>
        <li><b>&ldquo;Watching&rdquo; on your TV:</b> friends see what you&rsquo;re watching on the TV in your room. You can turn this off in Bottega&rsquo;s Settings.</li>
        <li>
          <b>Anonymous totals:</b> studios and other companies may receive, and may pay for, anonymous totals for an episode:
          for each minute, how many viewers were still watching and how many reactions there were. These are only made
          for episodes that at least 20 people who allow it have watched, and never include names, comments or anything
          that points to one person. Your Bottega room is never part of them. You can turn this off in Margins&rsquo;
          Settings.
        </li>
      </ul>

      <h2>Who can see your room</h2>
      <p>You choose in your room&rsquo;s settings: your friends, anyone with the link, or just you. Usernames are visible to signed-in people so friends can find each other.</p>

      <h2>Who helps run Bottega</h2>
      <ul>
        <li><b>Supabase</b> stores the database, sign-ins and uploaded files.</li>
        <li><b>Vercel</b> hosts the website and app pages.</li>
        <li><b>Resend</b> sends sign-in codes and Bottega&rsquo;s emails.</li>
        <li><b>Apple</b> and <b>Google</b> deliver phone notifications. Browser notifications go through your browser&rsquo;s own notification service.</li>
        <li>When you search for a song, book, film or show, the search goes to <b>Apple Music</b>, <b>Open Library</b>, <b>TMDB</b> or <b>YouTube</b>, and covers are loaded from them.</li>
      </ul>
      <p>We don&rsquo;t sell your personal data, show ads, or track you across other apps and websites.</p>

      <h2>How long it&rsquo;s kept</h2>
      <p>
        Until you delete it, except for the things above that go sooner: tonight&rsquo;s rooms after two days, club chat
        after three months, and the scrambled network address after an hour.
      </p>
      <p>
        <b>Delete my account</b> in Settings removes your account, room, uploads, friends, messages, club posts, ratings,
        Margins comments and settings for good. What you put on a club&rsquo;s shelf or schedule stays with the club,
        without your name. If you host a club, the club goes too, so hand it to another host first.
        Usage events are kept only in a form no longer linked to you, and anonymous Margins totals already made can&rsquo;t
        be traced back to you. If someone reports a message, a copy of it is kept with the report so it can be reviewed.
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
