# Margins → Bottega: Step 1 answers (from the Bottega side)

Nothing has been changed yet. These are the facts the Margins side needs, plus a few places where the plan should adapt.

## 1. Stack
- **Web:** Next.js 16 (App Router), deployed on Vercel at https://bottegarooms.com. The repo's live branch is `main`.
- **Supabase project ref:** `binvqbsucgohfcqjzoqp` (https://binvqbsucgohfcqjzoqp.supabase.co). It uses the new publishable/secret API keys, not the legacy anon/service_role JWT keys.
- **Migrations** live in `supabase/migrations/` and are run by hand in the SQL editor (each one is safe to run again).
- **Server code** is Next.js route handlers in `src/app/api/*`, not Supabase edge functions. There are no edge functions in the project today.

## 2. Accounts
- **Table:** `public.profiles(id uuid pk → auth.users on delete cascade, username citext unique check '^[a-z0-9_]{3,20}$', created_at)`. Usernames can't be changed (trigger `freeze_username`).
- **Claiming a name:** RPC `public.claim_username(p_username, p_room_name, p_theme)` creates the profile and the room in one step. Every profile has exactly one room (`public.rooms`, primary key `owner_id`).
- **"Start with just a name":** Supabase anonymous sign-in (`signInAnonymously`), then `claim_username`. Guests are detected with `public.is_guest()`, which reads `auth.jwt()->>'is_anonymous'`. Restrictive RLS policies stop guests from writing to other people: no chat, letters, room notes, recommendations, friend requests, or starting clubs. **Margins comments should follow the same rule:** add a restrictive policy so guests can't insert `margins.comments` until they add an email.
- **Adding an email later:** `auth.updateUser({ email })`, then `verifyOtp({ type: "email_change" })` with the 6-digit code, then an optional password. The account keeps its id.
- **Sign-in methods:** email one-time code (`signInWithOtp` / `verifyOtp`), with an optional password. **There's no Sign in with Apple and no other OAuth today.** Enabling Apple in Bottega's project is fine. The Apple provider's client IDs can hold both `com.caglaazizoglu.margins` and later `com.kkggr2.bottega`.
- **Account deletion:** `POST /api/account/delete` (Next.js, `src/app/api/account/delete/route.ts`). It removes the person's files in storage `media/<id>/`, anonymises their growth events (`forget_user_events`), then calls `auth.admin.deleteUser`, and everything cascades from `auth.users` → `profiles`. **So if every `margins.*` table references `public.profiles(id) on delete cascade`, deleting the account already removes the Margins data.** A separate delete-account edge function isn't needed: the Margins app can call `https://bottegarooms.com/api/account/delete` with the user's access token as `Authorization: Bearer …`.

## 3. Friends
- **Mutual friends, with requests.** Table: `public.friendships(requester uuid, addressee uuid, status 'pending'|'accepted', created_at)`, primary key (requester, addressee). A unique index on the unordered pair allows one friendship per pair.
- **Helper:** `public.are_friends(a uuid, b uuid) returns boolean` (security definer, accepted only).
- **There's no `my_friends()` yet.** I'll add `public.my_friends() returns setof uuid`, plus a version with usernames, in Step 2.
- **Blocks:** `public.blocks(blocker, blocked, created_at)` already exists. **Recommendation:** Margins should use this table instead of a `margins.blocks`, so one block covers rooms and comments.

## 4. Room items
- **Table:** `public.pieces(id uuid, owner_id → rooms, type, title, subtitle, body, image_path, audio_path, link, cover_url, preview_url, clip_start, clip_end, position, created_at)`. `type` is one of `poster` (a film on the wall), `scene` (a YouTube clip for the TV), `book`, `song`, `poem`, `game`. The limit is 80 pieces per room.
- **How a film is identified: there's no TMDB id column.** A film is free text: `title`, `subtitle` = "Director · Year", and `cover_url` from `image.tmdb.org`. Search goes through TMDB on the server (`src/lib/tmdb.ts`, env `TMDB_READ_TOKEN`; `/api/films` searches films and TV series together), but the id isn't stored.
- **"Now showing" / "On the turntable" / the open book:** these are columns on `public.rooms`: `now_film` (→ a `scene`/`poster` piece in that room), `now_song` (→ a `song` piece), `now_book` (→ a `book` piece), each with a `now_*_at` timestamp set by a trigger (`check_now_playing`). They always point at a piece the owner hung themselves.
- **Effect on Step 3.1:** a live "Watching Severance · S1 E3" doesn't fit `now_film`, because that has to be a piece in the room. The plan is to **derive it** instead: the room page asks a new security-definer function (for example `public.watching_now(p_owner uuid)`) for the latest `margins.watch_sessions` row from the last ~2 hours. It returns only show, season, episode and show title, and only when the viewer may see the room and the owner hasn't turned the setting off. When it returns something, it takes precedence over `now_film` on the TV. A new `profiles.show_watching boolean default true` holds the setting.
- To support this, `margins.watch_sessions` needs the **show name** (or a small `margins.shows` cache keyed by TMDB TV id), so the room can label it without calling TMDB.
- **Room visibility:** `rooms.visibility` is `friends` / `public` / `private`, checked by `public.can_view_room(owner)`. Anything Margins shows in a room has to go through `can_view_room`.

## 5. Native app and links
- **Bottega has a native iOS app** (Capacitor, bundle id `com.kkggr2.bottega`, team `SS8NYAS49K`). It loads the live site. An Android project (`com.kkggr2.bottega`) is going through Play Console set-up.
- **Universal links are already set up.** The entitlement has `applinks:bottegarooms.com` and `applinks:www.bottegarooms.com`. The association file is served by `src/app/.well-known/apple-app-site-association/route.ts` with app id `SS8NYAS49K.com.kkggr2.bottega` for `/r/*`, `/join/*`, `/club/*` and `/start`. There's also `assetlinks.json` for Android.
- **For Margins:** add a second entry to `applinks.details` with `appIDs: ["SS8NYAS49K.com.caglaazizoglu.margins"]` and `/watch/*`. Bottega's app doesn't claim `/watch/*`, so there's no conflict. The Margins app needs `applinks:bottegarooms.com` in its own entitlements. Apple fetches the file when the app is installed or updated.

## 6. Name clashes
- **`profiles`:** clashes. Margins must use `public.profiles` and add `share_in_insights boolean not null default true` there, as planned.
- **`blocks`:** clashes. Use `public.blocks` (see 3).
- **`reports`:** clashes in name only. `public.reports` is for reporting rooms and people (`reporter`, `owner_id`, `reason`). Keep Margins' comment reports as `margins.reports`.
- **`comments`, `likes`, `watch_sessions`:** no clash. Bottega's equivalents are named `notes` (room guestbook) and `reactions` (on pieces).
- Putting everything under a `margins` schema avoids clashes either way. Remember to grant `usage on schema margins` to `authenticated` and to add the schema to the Data API's exposed schemas.

## Other things the Margins side should know
- **Usernames are frozen once claimed**, and the rules are `^[a-z0-9_]{3,20}$`. Margins' username screen should call `claim_username`, which creates the room too, so every Margins user has a Bottega room from day one.
- **Logged-out visitors (`anon`) get nothing** from Margins tables, matching Bottega.
- **Privacy:** the privacy policy and terms live at `/privacy` and `/terms` (`src/app/privacy`, `src/app/terms`). They'll be updated in Step 2 to cover Margins viewing data and the anonymous studio insights, with room data excluded.
