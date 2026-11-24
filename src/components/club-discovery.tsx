"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  clubDiscovery, clubSuggestion, meetsLine, myTown, notForMe, setClubDiscovery, setMyTown,
  type Discovery, type Suggestion,
} from "@/lib/clubs";
import { useT } from "@/lib/i18n";
import { Sheet } from "./sheet";

/*
 * Clubs that grow. A host can let people whose rooms share the club's taste find it: the same films, books or
 * records as the club's shelf, or the same directors, authors or artists. Those people see the club once, in the
 * Salon, with the reason ("You both have Love and The Return"). The host sees how many, never who.
 * In-person clubs only reach people who've said they're in that town; online clubs reach anyone.
 */

// ---------------------------------------------------------------------------
// For hosts, on the People tab
// ---------------------------------------------------------------------------

export function ClubOpenSwitch({ clubId, clubName }: { clubId: string; clubName: string }) {
  const t = useT();
  const [d, setD] = useState<Discovery | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const load = useCallback(async () => setD(await clubDiscovery(clubId)), [clubId]);
  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- fetching on open

  if (!d) return null;
  const where = meetsLine(d);
  const status = d.discoverable
    ? (d.reach === 1 ? t("On · {where} · 1 person shares your taste", { where }) : t("On · {where} · {n} people share your taste", { where, n: d.reach }))
    : t("Off. Only people with your link can join.");

  async function flip(on: boolean) {
    // Turning it on needs a place first; turning it off is one tap.
    if (on && !d!.meets_online && !d!.meets_in) return setEditing(true);
    setD({ ...d!, discoverable: on });
    await setClubDiscovery(clubId, on, { town: d!.meets_in, online: d!.meets_online, when: d!.meets_when });
    void load();
  }

  return (
    <div className="club-open">
      <label className="settings-row">
        <span>{t("Let people who share your taste find {club}", { club: clubName })}<small>{status}</small></span>
        <input className="switch" type="checkbox" role="switch" checked={d.discoverable} onChange={(e) => void flip(e.target.checked)} />
      </label>
      <button type="button" className="linkish" onClick={() => setEditing(true)}>{d.discoverable ? t("Change where and when") : t("How this works")}</button>
      {editing && <DiscoverySheet clubId={clubId} clubName={clubName} d={d} onClose={() => setEditing(false)} onDone={() => { setEditing(false); void load(); }} />}
    </div>
  );
}

function DiscoverySheet({ clubId, clubName, d, onClose, onDone }: {
  clubId: string; clubName: string; d: Discovery; onClose: () => void; onDone: () => void;
}) {
  const t = useT();
  const [online, setOnline] = useState(d.meets_online);
  const [town, setTown] = useState(d.meets_in);
  const [when, setWhen] = useState(d.meets_when);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(on: boolean) {
    if (on && !online && !town.trim()) return setError(t("Say which town you meet in, or choose online."));
    setBusy(true);
    const err = await setClubDiscovery(clubId, on, { town: town.trim(), online, when: when.trim() });
    setBusy(false);
    if (err) return setError(t(err));
    onDone();
  }

  return (
    <Sheet onClose={onClose} onSubmit={() => save(true)} label={t("Let people who share your taste find {club}", { club: clubName })}>
      <h2>{t("Let people who share your taste find {club}", { club: clubName })}</h2>
      <ul className="discover-how">
        <li>{t("People whose rooms have the same films or books as your shelf see {club} once, in their Salon.", { club: clubName })}</li>
        <li>{t("They see why: \"You both have The Return and Love.\" They choose whether to have a look.")}</li>
        <li>{t("You see how many people match, never who. Turn it off any time.")}</li>
      </ul>

      <fieldset className="discover-where">
        <legend>{t("Where do you meet?")}</legend>
        <label className="check"><input type="radio" name="meets" checked={!online} onChange={() => setOnline(false)} /> <span>{t("In a town")}</span></label>
        {!online && (
          <div className="field">
            <label htmlFor="meets-town">{t("Town")}</label>
            <input id="meets-town" type="text" maxLength={60} value={town} onChange={(e) => setTown(e.target.value)} placeholder="Milton Keynes" />
            <span className="hint">{t("Only people who've said they're in this town will see your club.")}</span>
          </div>
        )}
        <label className="check"><input type="radio" name="meets" checked={online} onChange={() => setOnline(true)} /> <span>{t("Online")}</span></label>
      </fieldset>

      <div className="field">
        <label htmlFor="meets-when">{t("When (optional)")}</label>
        <input id="meets-when" type="text" maxLength={60} value={when} onChange={(e) => setWhen(e.target.value)} placeholder={t("Wednesdays, 6:30pm")} />
      </div>

      <p className="msg err" aria-live="polite">{error}</p>
      <div className="row">
        {d.discoverable && <button className="btn ghost" type="button" disabled={busy} onClick={() => save(false)}>{t("Turn it off")}</button>}
        <button className="btn ghost" type="button" onClick={onClose}>{t("Close")}</button>
        <button className="btn" type="submit" disabled={busy}>{busy ? t("Saving…") : d.discoverable ? t("Save") : t("Turn it on")}</button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// In the Salon: one club that shares your taste (never a list), and a way to say where you are
// ---------------------------------------------------------------------------

export function ClubSuggestionCard() {
  const t = useT();
  const [s, setS] = useState<Suggestion | null | undefined>(undefined);
  const [town, setTown] = useState<string | null>(null);
  useEffect(() => {
    clubSuggestion().then(setS).catch(() => setS(null));
    myTown().then(setTown).catch(() => setTown(""));
  }, []);

  if (s === undefined || town === null) return null;
  if (!s) return town ? null : <TownAsk onSaved={async (tn) => { setTown(tn); setS(await clubSuggestion()); }} />;

  const shared = s.shared.length === 1 ? s.shared[0]
    : s.shared.length === 2 ? t("{a} and {b}", { a: s.shared[0], b: s.shared[1] })
    : t("{a}, {b} and {c}", { a: s.shared[0], b: s.shared[1], c: s.shared[2] });

  return (
    <section className="tonight club-suggest" aria-label={t("A club that shares your taste")}>
      <p className="club-suggest-label">{t("A club that shares your taste")}</p>
      <div className="club-suggest-name">
        <span aria-hidden="true">{s.emoji}</span>
        <h2>{s.name}</h2>
      </div>
      <p className="club-suggest-where">{meetsLine(s)}{s.members > 1 ? ` · ${t("{n} members", { n: s.members })}` : ""}</p>
      {s.shared.length > 0 && <p className="club-suggest-why">{t("You both have {titles}.", { titles: shared })}</p>}
      <div className="row">
        <Link className="btn" href={`/join/${s.slug}`}>{t("Have a look")}</Link>
        <button className="btn ghost" type="button" onClick={() => { void notForMe(s.club_id); setS(null); }}>{t("Not for me")}</button>
      </div>
    </section>
  );
}

const TOWN_LATER = "bottega.townAsk.later";

function TownAsk({ onSaved }: { onSaved: (town: string) => void }) {
  const t = useT();
  const [hidden, setHidden] = useState(() => { try { return Boolean(localStorage.getItem(TOWN_LATER)); } catch { return false; } });
  const [town, setTown] = useState("");
  const [busy, setBusy] = useState(false);
  if (hidden) return null;

  async function save() {
    if (!town.trim()) return;
    setBusy(true);
    const ok = await setMyTown(town);
    setBusy(false);
    if (ok) onSaved(town.trim());
  }

  return (
    <section className="tonight town-ask" aria-label={t("Clubs near you")}>
      <h2>{t("Clubs near you")}</h2>
      <p>{t("Say which town you're in, and film and book clubs there that share your taste can show up here. Nobody else sees your town.")}</p>
      <form className="town-ask-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <label htmlFor="my-town" className="sr-only">{t("Your town")}</label>
        <input id="my-town" type="text" maxLength={60} value={town} onChange={(e) => setTown(e.target.value)} placeholder={t("Your town")} />
        <button className="btn" type="submit" disabled={busy || !town.trim()}>{t("Save")}</button>
      </form>
      <button type="button" className="linkish" onClick={() => { try { localStorage.setItem(TOWN_LATER, "1"); } catch {} setHidden(true); }}>{t("Not now")}</button>
    </section>
  );
}
