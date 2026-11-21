# Moving the database from Singapore to Frankfurt

**Why:** Bottega's users are in Europe; the database is in Singapore, so every tap waits for a trip across the world.
In Frankfurt the app answers several times faster.

**What stays the same:** every account, room, piece, club, quiz score, message and uploaded picture. Everyone stays
logged in (the app trades their login for a new one by itself, once). The iPhone app needs no update.

**How long:** about an hour, of which the app should rest for ~20–30 minutes. Do it late at night.

**Safety:** nothing is deleted. The Singapore project stays as it is for two weeks; switching back takes 5 minutes.

Passwords and keys: you paste them only into the scripts on your Mac, into Supabase and into Vercel. Never into the chat.

---

## A. Any day before: get Frankfurt ready (about 20 minutes)

1. **New project.** supabase.com → your organisation → **New project**
   - Name: `bottega-eu` · Region: **Central EU (Frankfurt)** · Plan: Free
   - Database password: let it generate a strong one and **save it in your password manager**.

2. **Copy the sign-in settings.** Open the old and the new project side by side and make the new one match:
   - **Authentication → Sign In / Providers:** Email on, with the same "Confirm email" setting.
     **Allow anonymous sign-ins: on** (guests who join a club with just a name need it).
   - **Authentication → URL Configuration:** the same **Site URL** (`https://bottegarooms.com`) and **every Redirect
     URL**, copied exactly.
   - **Authentication → Emails:** if you changed any email template or set up your own email sender (SMTP), copy
     those too.
   - **Database → Extensions:** turn on any extension that's on in the old project and off in the new one
     (Bottega uses `citext`).

3. **Docker:** Docker Desktop is installed on your Mac. On move night, open it and wait until it says it's running.

---

## B. Move night (about 40 minutes)

Pick a late hour (for example 02:00 Istanbul time). Then, in order:

4. **Connection strings.** In each project: **Connect** (top of the dashboard) → **Session pooler** → copy the URI
   and put your database password in place of `[YOUR-PASSWORD]`. Keep both in your password manager for the night.

5. **Copy the database** (accounts, rooms, everything). In Terminal:
   ```bash
   cd ~/bottega && bash scripts/move/1-copy-database.sh
   ```
   Paste the Singapore string, then the Frankfurt one (nothing shows while you paste). It takes a few minutes and
   ends with "Done". If it stops with an error, nothing has changed anywhere: send Claude the error message (not
   the connection strings).

6. **Copy the uploaded pictures and sound clips.**
   ```bash
   node scripts/move/2-copy-files.mjs
   ```
   It asks for each project's URL and **secret key** (Settings → API Keys). It ends with "✓ All … files are in Frankfurt".

7. **Compare old and new.**
   ```bash
   bash scripts/move/3-compare.sh
   ```
   Every line should show the same number twice and a ✓. If only **"live tables"** differs, open the Frankfurt
   project's **SQL Editor**, paste in the contents of `scripts/move/realtime.sql` and run it. For anything else,
   tell Claude what differs.

8. **Point the app at Frankfurt.** Vercel → **bottega** → Settings → **Environment Variables**. Change these to the
   **Frankfurt** project's values (Settings → API Keys in Supabase):
   - `NEXT_PUBLIC_SUPABASE_URL` (the new project URL)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the new publishable key)
   - `SUPABASE_SECRET_KEY` (the new secret key)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`, only if it's there

   Then tell Claude **"switched"**: Claude moves the server to Frankfurt too (`vercel.json` → `fra1`) and pushes,
   which also rebuilds the site with the new values.

9. **Your Mac's copy of the settings.** In `~/bottega/.env.local`, change the same URL and publishable key, so the
   local version talks to Frankfurt as well.

---

## C. Check (10 minutes)

On your phone (app) and on bottegarooms.com:
- [ ] You're still logged in (the app may reload once by itself).
- [ ] Your room opens, with pictures and covers.
- [ ] A friend's room opens; the Library shows the hallway.
- [ ] Play a club quiz or open the Quiz room; open a club and its chat.
- [ ] Hang a new piece; upload a picture.
- [ ] Log out and log in again with your password.
- [ ] bottegarooms.com/numbers loads.

If something's wrong and can't be fixed quickly: **switch back** by putting the Singapore values back in Vercel
(step 8) and telling Claude "switch back". People who logged in during the Frankfurt time may need to log in again.

## D. Two weeks later

If all is well: Supabase → the **Singapore** project → Settings → **Pause project**. Delete it a while after that.
Then delete the private copies on your Mac: `rm -rf ~/bottega-move`.
