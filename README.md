# Bottega

Everyone gets one room. Fill it with your taste (film posters, scenes, poems, games, songs that play when clicked) and step into your friends' rooms from your library shelf. Friends find each other by username.

Built with Next.js 16, Supabase (sign-in, Postgres, storage, realtime) and plain CSS.

## Set up (about 10 minutes)

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (the free tier is enough).
2. **Create the database.** In the Supabase dashboard open **SQL Editor → New query**, paste all of [`supabase/migrations/20261103000000_init.sql`](supabase/migrations/20261103000000_init.sql), and click **Run**. This creates the tables, access rules, the private `media` bucket and live updates.
3. **Allow sign-in links back to your app.** In **Authentication → URL Configuration**, set **Site URL** to `http://localhost:3000` (and later add your real domain under **Redirect URLs**).
4. *(Optional)* To let people type a 6-digit code instead of clicking the link, edit **Authentication → Emails → Magic Link** and add `{{ .Token }}` to the template.
5. **Connect the app.** Copy `.env.example` to `.env.local` and fill in the values from **Project Settings → API** (the project URL and the publishable or anon key).
   For film search, add `TMDB_READ_TOKEN` from [themoviedb.org](https://www.themoviedb.org/settings/api) (the "API Read Access Token"). It stays on the server.
   Also run every later file in `supabase/migrations/` in date order.
6. Run it:

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000.

## How it's built

| Where | What |
| --- | --- |
| `supabase/migrations/` | Tables (`profiles`, `rooms`, `pieces`, `friendships`), row level security, storage rules, the `claim_username` function |
| `src/components/gate.tsx` | Sends people through setup → sign-in → pick a username |
| `src/components/library.tsx` | The shelf, friend requests, adding friends by username |
| `src/components/room.tsx` | A room: wall, pieces, record player, owner controls, live updates |
| `src/components/piece-*.tsx` | How each piece looks, its detail sheet, and the editor |
| `src/lib/` | Supabase client, themes, media upload, music embeds, friendship helpers |

### Who can see what

The database enforces this, not just the app:

- Usernames and room names (the "door") are visible to anyone signed in, so friends can find each other.
- What's on the walls, and the uploaded images and clips, follow the room's **Who can come in** setting: *Friends* (the default), *Anyone signed in*, or *Just me*.
- Only the owner can change a room or its pieces. Friend requests can only be accepted by the person they were sent to.
- Usernames can't be changed after they're claimed. A room holds up to 80 pieces.

### Songs

- **Clips** you upload (MP3, M4A, OGG, WEBM or WAV, up to 60 seconds and 10 MB) play when someone clicks the record.
- **Links** from Spotify, Apple Music, YouTube or SoundCloud get a built-in player in the song's detail sheet.

## Where search results come from

- Songs, cover art and 30-second previews: Apple's iTunes Search API
- Books and covers: [Open Library](https://openlibrary.org)
- Films, TV, posters, stills and trailers: [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB.
- Scene titles and thumbnails: YouTube

## Deploy

Push to GitHub, import the repo on [Vercel](https://vercel.com), add the two `NEXT_PUBLIC_SUPABASE_*` variables and `TMDB_READ_TOKEN`, and add your Vercel URL to Supabase's **Redirect URLs**.

## Phone apps (iOS and Android)

The apps are [Capacitor](https://capacitorjs.com) shells around the live site (`server.url` in `capacitor.config.ts`), so every deploy to Vercel reaches them without a store update. `native/www/offline.html` shows when there's no connection.

- In the app, sign-in is by **code**, since email links open the browser. Add `{{ .Token }}` to Supabase's Magic Link email template.
- Records and scenes keep playing with the iPhone's silent switch on.
- Icons and the launch screen come from `assets/`; regenerate with `npx @capacitor/assets generate` (then delete any `icons/` folder and `public/manifest.webmanifest` it creates for the web).

```bash
npx cap sync          # after changing capacitor.config.ts or adding a plugin
npx cap open ios      # opens Xcode: pick a device and press Run
npx cap open android  # needs Android Studio
```

## Next up

Drag-and-drop placement on the wall, share previews for `/r/username` links, notifications, report and block, and an installable phone app.
