"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { forgetStartClub, rememberStartClub } from "@/lib/clubs";
import { useAuth } from "./auth";
import { StartClubForm } from "./club";
import { Onboard } from "./onboard";
import { SignIn } from "./sign-in";

/*
 * bottegarooms.com/start — for a club organiser coming from an email: what a club gets,
 * an account if they need one, then naming the club. They land on their new club page.
 */
export function StartClubScreen() {
  const auth = useAuth();
  const router = useRouter();

  // Remember where they were going, so after sign-up (or a confirmation link) they come back here.
  useEffect(() => {
    if (auth.status === "signedOut" || auth.status === "needsUsername") rememberStartClub();
  }, [auth.status]);

  return (
    <div className="start-club">
      <header className="start-head">
        <p className="join-emoji" aria-hidden="true">📚🎬</p>
        <h1>Start your club on Bottega</h1>
        <p className="lede">A home for your film club, book club or group of friends — free, no ads.</p>
        <ul className="start-perks">
          <li><b>Read together, no spoilers</b><span>Everyone says how far they are; notes on each chapter stay folded until they get there.</span></li>
          <li><b>Meetings</b><span>Date and place, who&rsquo;s coming, and a reminder the day before.</span></li>
          <li><b>Your shelf</b><span>Everything you&rsquo;ve read or watched together, so new members see what you&rsquo;re about.</span></li>
          <li><b>What&rsquo;s next?</b><span>Put up a few choices and let everyone vote.</span></li>
          <li><b>A club chat</b><span>Only for members, with co-hosts who can keep it friendly. Notifications on iPhone, Android and computers.</span></li>
          <li><b>Your own quiz</b><span>Made for your club, on your next book or film, with your own high score table.</span></li>
          <li><b>One link</b><span>Everyone who opens it lands in your club, on the web or the iPhone app.</span></li>
        </ul>
      </header>

      {auth.status === "loading" ? (
        <p className="loading">One moment…</p>
      ) : auth.status === "signedOut" ? (
        <SignIn forClub />
      ) : auth.status === "needsUsername" ? (
        <Onboard />
      ) : auth.status === "ready" ? (
        <section className="start-form">
          <h2 className="join-title">Name your club</h2>
          <StartClubForm onDone={(slug) => { forgetStartClub(); router.push(`/club/${slug}?new=1`); }} />
        </section>
      ) : null}
    </div>
  );
}
