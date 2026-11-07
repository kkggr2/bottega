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

## 6. Before submitting to the App Store

- Remove `APNS_SANDBOX` in Vercel (App Store and TestFlight builds use Apple's production push).
- In `ios/App/App/App.entitlements`, Xcode switches `aps-environment` to `production` when you archive for distribution. Nothing to do by hand.
- App Store Connect: create the app (bundle ID `com.kkggr2.bottega`), screenshots of a full room, privacy details (email for sign‑in; usage events such as rooms viewed, pieces added and shares, linked to the account when signed in and used only for product analytics, never for ads or tracking across apps), and a review note explaining the widget and notifications.
