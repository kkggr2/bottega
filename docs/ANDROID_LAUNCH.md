# Bottega on Android (Google Play)

The Android app is ready in the `android/` folder. Like the iPhone app, it loads the live site, so every update to
bottegarooms.com reaches Android too. Room, club and invite links open in the app, and `bottega://` links work.
Version 1.2 (code 2).

What's not in the first Android release: **push notifications** (they need a Firebase project, see the end).
Everything else works as on the web.

## 1. Accounts (you, once)

1. **Google Play developer account:** play.google.com/console → sign up. US$25 once, and Google checks your ID (a few days).
   - **Important:** new *personal* accounts must run a **closed test with at least 12 testers for 14 days** before the app
     can go public. Ask 12 friends with Android phones now; their Gmail addresses go into the test list.
   - An *organisation* account skips this, but needs a D-U-N-S number for a registered business.
2. **Android Studio:** developer.android.com/studio (free, about 1 GB). Open it once so it downloads the Android SDK.

## 2. Build the app (Claude can do this once Android Studio is installed)

```bash
cd ~/bottega
npx cap sync android
npx cap open android
```

In Android Studio: **Build → Generate Signed App Bundle or APK → Android App Bundle → Create new key store**.
- Save the key store somewhere safe **outside** the bottega folder (and in your password manager). Never share it or put it in git.
- Google Play keeps the real signing key ("Play App Signing"); yours is the upload key. If you ever lose it, Google can reset it.
- Choose **release**. Android Studio writes `app-release.aab`.

## 3. The Play Store listing

In Play Console → **Create app**: name "Bottega: Rooms with Friends", free, app.
Most of it mirrors the App Store (texts are in APP_STORE_LAUNCH.md):
- **Short description** (80 characters): "One room for the films, books and records you love. Visit your friends' rooms."
- **Full description:** the App Store description.
- **Graphics:** icon 512×512 (`assets/icon-only.png`), feature graphic 1024×500, at least 2 phone screenshots.
- **App content:** privacy policy `https://bottegarooms.com/privacy`, data safety (same answers as Apple's App Privacy),
  target audience 13+, ads: none, content rating questionnaire.
- **Account deletion URL:** `https://bottegarooms.com/support` (deleting is also in the app: Library → bottom).

Then **Testing → Closed testing → Create track**, upload `app-release.aab`, add the 12 testers' emails, and send them the
opt-in link. After 14 days: **Production → Create release** with the same bundle.

## 4. Make links open the app

Play Console → your app → **Test and release → App integrity → App signing** → copy the **SHA-256 certificate fingerprint**.
In **Vercel → bottega → Settings → Environment Variables** add `ANDROID_CERT_SHA256` with that value, and redeploy.
Check: `https://bottegarooms.com/.well-known/assetlinks.json` shows it.

## 5. Later: push notifications on Android

1. console.firebase.google.com → add project → add an Android app with package `com.kkggr2.bottega`.
2. Download `google-services.json` into `android/app/`.
3. Firebase → Project settings → Service accounts → generate a private key; that JSON goes into Vercel (never into git).
4. Tell Claude: the app and the server then need a small change to send to Android as well as iPhone.

## Updating

Most updates need nothing: the app shows the live site. Only native changes (new plugins, icons, links) need a new bundle:
raise `versionCode` in `android/app/build.gradle`, build again, upload to Play Console.
