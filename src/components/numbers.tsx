"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { Gate } from "./gate";

/* bottegarooms.com/numbers: only for people in public.admins (supabase/migrations/20261127000000_numbers.sql). */

type Source = { source: string; visitors: number; signups: number; room5: number; friend: number; can_return: number; returned: number };
type Numbers = {
  days: number;
  totals: { people: number; public_rooms: number; pieces: number; clubs: number; signups: number; guests: number; room5: number; friend: number; can_return: number; returned: number };
  sources: Source[];
  daily: { day: string; signups: number }[];
};

export function NumbersRoute() {
  return <Gate>{(me) => <NumbersView me={me} />}</Gate>;
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

function NumbersView({ me }: { me: Profile }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Numbers | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    supabase().rpc("growth_numbers", { p_days: days }).then(({ data: d, error: e }) => {
      if (!live) return;
      if (e) setError(/team/i.test(e.message) ? "This page is only for Bottega's team." : /growth_numbers|schema cache/i.test(e.message)
        ? "The database needs its latest update: run supabase/migrations/20261127000000_numbers.sql." : "Couldn't load the numbers.");
      else { setError(null); setData(d as Numbers); }
    });
    return () => { live = false; };
  }, [days]);

  if (error) return <section className="empty-wall"><h2>{error}</h2></section>;
  if (!data) return <p className="loading">Counting…</p>;
  const t = data.totals;
  const max = Math.max(1, ...data.daily.map((d) => d.signups));

  return (
    <div className="numbers">
      <section className="lib-head">
        <div>
          <p className="smallcaps">Only for you, @{me.username}</p>
          <h1>The numbers</h1>
          <p>Who came, who filled a room, who found a friend, who came back. Per invite link.</p>
        </div>
        <div className="chips" role="group" aria-label="Period">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" className="chip" aria-pressed={days === d} onClick={() => { setData(null); setDays(d); }}>Last {d} days</button>
          ))}
        </div>
      </section>

      <section className="num-cards">
        <Card label="New people" value={String(t.signups)} note={t.guests ? `${t.guests} joined a club as guests` : "made a room"} />
        <Card label="Filled a room on day one" value={pct(t.room5, t.signups)} note={`${t.room5} hung 5+ pieces in their first 24 hours`} />
        <Card label="Added a friend" value={pct(t.friend, t.signups)} note={`${t.friend} have at least one friend inside`} />
        <Card label="Came back in week 2" value={pct(t.returned, t.can_return)} note={t.can_return ? `${t.returned} of the ${t.can_return} who joined 14+ days ago` : "shows once people are 14 days old"} />
      </section>
      <p className="hint">The one to watch: <b>came back in week 2</b>. Around 30% or more means people like it enough to return.</p>

      <section>
        <h2 className="num-h">Sign-ups per day</h2>
        {data.daily.length ? (
          <div className="num-bars" role="img" aria-label="Sign-ups per day">
            {data.daily.map((d) => (
              <span key={d.day} title={`${d.day}: ${d.signups}`} style={{ height: `${(d.signups / max) * 100}%` }}><i>{d.signups}</i></span>
            ))}
          </div>
        ) : <p className="muted">No new rooms in this period yet.</p>}
      </section>

      <section>
        <h2 className="num-h">Where people came from</h2>
        <div className="num-table-wrap">
          <table className="num-table">
            <thead>
              <tr><th>Source</th><th>Visited</th><th>Joined</th><th>Room day 1</th><th>Friend</th><th>Back wk 2</th></tr>
            </thead>
            <tbody>
              {data.sources.map((s) => (
                <tr key={s.source}>
                  <td>{s.source}</td>
                  <td>{s.visitors || "–"}</td>
                  <td>{s.signups}</td>
                  <td>{s.signups ? `${s.room5} · ${pct(s.room5, s.signups)}` : "–"}</td>
                  <td>{s.signups ? `${s.friend} · ${pct(s.friend, s.signups)}` : "–"}</td>
                  <td>{s.can_return ? `${s.returned}/${s.can_return}` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">“Visited” counts people who opened an invite link. “not tracked” is everyone who joined before invite links existed.</p>
      </section>

      <InviteLinks />

      <section>
        <h2 className="num-h">All of Bottega</h2>
        <p className="muted">{t.people} people · {t.public_rooms} rooms open to everyone · {t.pieces} pieces hung · {t.clubs} clubs</p>
      </section>
    </div>
  );
}

function Card({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="num-card">
      <p className="smallcaps">{label}</p>
      <b>{value}</b>
      <span className="muted">{note}</span>
    </div>
  );
}

/** Make an invite link for a creator, club or post. */
function InviteLinks() {
  const [name, setName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const via = name.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);
  const links = via ? [
    ["Front page", `https://bottegarooms.com/?via=${via}`],
    ["Your room", `https://bottegarooms.com/r/cagla?via=${via}`],
    ["Famous rooms", `https://bottegarooms.com/famous?via=${via}`],
  ] : [];
  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(url); } catch { /* press and hold to copy instead */ }
  }
  return (
    <section className="num-invite">
      <h2 className="num-h">Make an invite link</h2>
      <div className="field">
        <label htmlFor="via-name">Who is it for? (a creator, club or post)</label>
        <input id="via-name" type="text" placeholder="katrina, penguen, reel-nov24…" value={name} onChange={(e) => { setName(e.target.value); setCopied(null); }} />
        <span className="hint">Lowercase letters, numbers, - and _. Any Bottega link works with ?via= on the end.</span>
      </div>
      {links.map(([label, url]) => (
        <div className="num-link" key={url}>
          <span><b>{label}</b><code>{url.replace("https://", "")}</code></span>
          <button className="btn small" type="button" onClick={() => copy(url)}>{copied === url ? "Copied" : "Copy"}</button>
        </div>
      ))}
    </section>
  );
}
