# iPhone launch checklist

Everything below needs the Apple Developer account. The code is ready: the home‑screen widget (`ios/App/BottegaWidget`), push notifications (`src/lib/push.ts`, `src/lib/apns.ts`, `/api/push/now`) and the shared app group.

## 1. Run the database update (2 minutes)

Supabase → SQL Editor → paste all of `supabase/migrations/20261110000000_push.sql` → **Run**.

## 2. Sign the app with your team (5 minutes, in Xcode)

1. Open `ios/App/App.xcodeproj` in Xcode and sign in: **Xcode → Settings → Accounts → +**.
2. Click the blue **App** project at the top left, then for **each** target, **App** and **BottegaWidget**:
   - **Signing & Capabilities** → tick **Automatically manage signing** → **Team**: your team.
   - Check that **App Groups** shows `group.com.kkggr2.bottega` ticked. If Xcode shows a red warning there, click **+ Capability → App Groups** and tick it.
3. On the **App** target only, check **Push Notifications** is listed. If not: **+ Capability → Push Notifications**.

Xcode registers the app IDs (`com.kkggr2.bottega`, `com.kkggr2.bottega.widget`) and the app group with Apple for you.

## 3. Create the push key (5 minutes)

1. [developer.apple.com/account](https://developer.apple.com/account) → **Certificates, IDs & Profiles** → **Keys** → **+**.
2. Name it `Bottega push`, tick **Apple Push Notifications service (APNs)**, choose **Sandbox & Production**, then **Continue** → **Register**.
3. **Download** the `.p8` file. Apple lets you download it only once, so keep it safe.
4. Note the **Key ID** (10 characters, on that page) and your **Team ID** (top right of the account page, or Membership details).

## 4. Add the key to Vercel (keep it out of chats)

Vercel → Settings → Environment Variables → Production, each marked **Sensitive**:

| Name | Value |
|---|---|
| `APNS_KEY_P8` | Open the `.p8` file in TextEdit and paste **everything**, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines |
| `APNS_KEY_ID` | The Key ID |
| `APNS_TEAM_ID` | The Team ID |
| `APNS_SANDBOX` | `1`. Only while testing with the app installed from Xcode. **Delete it** before TestFlight and the App Store. |

Then **Redeploy**.

## 5. Test on your iPhone (10 minutes)

1. Plug in your iPhone, choose it at the top of Xcode, press **▶︎ Run**. The first time, approve the developer on the phone: **Settings → General → VPN & Device Management**.
2. In the app: log in, open **your library** (you need at least one friend) → **Turn on** under "Get a nudge when a friend puts something on" → **Allow**.
3. From your **second account** (on the website is fine), open a song → **Leave it on the turntable**.
4. Your phone should buzz: *"@yoursecondaccount put on …"*. Tap it and the room opens.
5. Long‑press the home screen → **+** → search **Bottega** → add the widget. It shows what friends have on.

If no notification arrives, tell Claude which step failed. The Vercel logs for `/api/push/now` will say why.

## 6. Before submitting

1. **Run the safety update:** Supabase → SQL Editor → all of `supabase/migrations/20261111000000_safety.sql` → **Run**. It adds blocking, reports and account deletion.
2. **Make hello@bottegarooms.com reach you.** Reports and support emails go there. Namecheap → Domain List → **Manage** → **Redirect Email** → **Add Forwarder**: alias `hello`, forward to your own inbox.
3. **Vercel:** delete `APNS_SANDBOX`, then **Redeploy**. App Store and TestFlight builds use Apple's production push service. Phones running the app straight from Xcode stop getting notifications after this; that's expected.
4. **Make a demo account for Apple's reviewer.** Apple needs to log in. On bottegarooms.com create e.g. `review@bottegarooms.com` (Namecheap can forward it too), give it a room with 5+ things, and make it friends with your own account, so the library, swiping and notifications have something to show.

## 7. Create the app in App Store Connect

[appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** → **+** → **New App**:

| Field | Value |
|---|---|
| Platform | iOS |
| Name | `Bottega`. If it's taken, `Bottega: Rooms with Friends` |
| Primary language | English (U.S.) |
| Bundle ID | `com.kkggr2.bottega` |
| SKU | `bottega-ios` |

Then fill in:

- **Subtitle (30 characters):** `Your taste, as a room`
- **Category:** Social Networking; secondary: Lifestyle
- **Privacy Policy URL:** `https://bottegarooms.com/privacy`
- **Support URL:** `https://bottegarooms.com/support`
- **Age rating:** answer honestly. User content and messaging between friends usually comes out at 12+ or 13+.
- **Description:**

  > Everyone gets one room. Hang the films that made you, shelve the books you'd lend, leave a record on the turntable that plays when a friend drops the needle.
  >
  > Add friends by username and their rooms line your library. See what they put on, step inside, and swipe from room to room.
  >
  > • Find songs, films and books in seconds, or bring in your Letterboxd films and Goodreads books
  > • A real turntable, TV and bookshelf: tap to play a song or a scene
  > • A widget for your home screen showing what friends have on
  > • A share picture of your room, sized for Stories
  >
  > No ads, no likes, no strangers' feeds. Just your friends' taste.

- **Keywords:** `taste,friends,music,films,books,letterboxd,goodreads,vinyl,room,library,share,profile`

### App Privacy (the "nutrition label")

Choose **Yes, we collect data** and tick, all **linked to the user**, **not used for tracking**:

- **Contact info → Email address:** App functionality
- **User content → Photos or videos, Audio data, Other user content:** App functionality
- **Identifiers → User ID, Device ID:** App functionality, Analytics
- **Usage data → Product interaction:** Analytics

This matches the app's built-in privacy manifest.

## 8. Upload a build

1. Xcode, top center: choose **Any iOS Device (arm64)**, not your phone and not a simulator.
2. Menu **Product → Archive**. Wait a few minutes.
3. The Organizer window opens: **Distribute App** → **App Store Connect** → **Upload** → keep the defaults → **Upload**.
4. After 10–30 minutes the build appears in App Store Connect under **TestFlight**. Apple emails you when it's processed.

For every later upload, raise the **Build** number by one: App target → **General** → Identity.

## 9. TestFlight first (recommended)

App Store Connect → **TestFlight** → **Internal Testing** → add yourself, then later friends as **External Testers** with a public link. Use it for a few days with real friends before submitting.

## 10. Submit for review

App Store Connect → your app → the **1.0** version:

1. **Screenshots** for 6.9" iPhone: at least 3 (1320 × 2868 px). Use a full room, the library with friends' updates, and the record playing. Claude can make these from the simulator.
2. **Build:** pick the uploaded build.
3. **App Review Information → Sign-in required:** the demo account's email and password.
4. **Notes for the reviewer** (paste):

   > Bottega is a social app where each person has one "room" of things they love (songs, films, books) and visits friends' rooms.
   > The demo account already has a room and a friend. Tap a record on the turntable to play a 30-second Apple Music preview; open the library to see friends' updates; long-press the home screen to add the Bottega widget.
   > User safety: every room has a ⋯ button to report it or block the person. Reports are emailed to us and reviewed within 24 hours. The Terms (shown at sign-up) forbid objectionable content.
   > Account deletion: Library → bottom → "Delete my account".
   > Notifications are only sent when a friend puts something on, at most once per friend every 6 hours.

5. **Add for Review** → **Submit to App Review**. Review usually takes 1–3 days.
