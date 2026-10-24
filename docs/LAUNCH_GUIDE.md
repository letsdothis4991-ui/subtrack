# Launching SubTrack on Google Play: step by step

Plan for **3–4 weeks** end to end. Most of that is Google's mandatory 14-day closed test for new personal developer accounts. Steps marked ⏱ involve waiting on Google.

Costs: Google Play developer account $25 one-off. Everything else starts free (Supabase free tier, GitHub, AdMob, which pays you).

---

## Phase 1: Accounts (day 1)

### 1. Google Play developer account ⏱
1. Go to https://play.google.com/console/signup and sign in with the Google account that should own the app (you can't transfer this later, so consider a dedicated one).
2. Choose **Personal** (just you) or **Organisation** (needs a D-U-N-S number, free from Dun & Bradstreet, takes a few days).
3. Pay the $25 fee, then complete **identity verification** (government ID) and verify your contact phone and email. You'll also be asked to verify that you own an Android device via the Play Console app.
4. Verification usually takes 1–3 days.

### 2. AdMob account
1. https://admob.google.com → sign in with the same Google account → finish sign-up and add payment details (you're paid monthly once you pass $100).
2. **Apps → Add app → Android → "No, it's not listed yet"** → name it SubTrack. Copy the **App ID** (`ca-app-pub-…~…`).
3. **Ad units → Add → Banner** → name it "Main banner". Copy the **Ad unit ID** (`ca-app-pub-…/…`).
4. **Privacy & messaging**: create a **GDPR** message and a **US state regulations** message for the app and publish both. The app already shows them.

### 3. Cloud sync
Follow **[CLOUD_SETUP.md](CLOUD_SETUP.md)**: about 15 minutes.

---

## Phase 2: Build the app (day 1–2)

### 4. Create your upload key
On your computer (needs Java, which Android Studio includes):
```bash
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```
Choose a strong password. **Back up `upload.jks` and the password somewhere safe (a password manager)**; never commit it. Then:
```bash
base64 -w0 upload.jks      # macOS: base64 -i upload.jks
```
and copy the output.

### 5. Add GitHub secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | output of the base64 command |
| `ANDROID_KEYSTORE_PASSWORD` | your keystore password |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | your key password (same as above if you only set one) |
| `ADMOB_ANDROID_APP_ID` | AdMob App ID from step 2 |
| `EXPO_PUBLIC_ADMOB_BANNER_ID` | AdMob banner unit ID from step 2 |
| `EXPO_PUBLIC_SUPABASE_URL` | from CLOUD_SETUP |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | from CLOUD_SETUP |

### 6. Turn on the web app and privacy page
Repo → **Settings → Pages → Source: GitHub Actions**. After the next push, the web app is at `https://<your-user>.github.io/<repo>/` and the privacy policy at `…/<repo>/privacy.html`. Edit `docs/PRIVACY.md` first and replace `<your-support-email@example.com>` with a real address.

### 7. Build the release bundle
1. Make sure `app.json` → `expo.android.package` is the ID you want forever (currently `com.reshpow.subtrack`).
2. Push to `main`. Open **Actions → Android build**, wait for it to go green (~15 min), and download the **subtrack-aab** artifact (unzip it to get `app-release.aab`). The **subtrack-apk** artifact can be installed directly on your phone to try it first.

---

## Phase 3: Set up the app in Play Console (day 2–3)

### 8. Create the app
Play Console → **Create app** → name "SubTrack – Subscription Tracker", default language, **App**, **Free**, accept the declarations.

### 9. Upload the first build (internal testing)
1. **Test and release → Testing → Internal testing → Create new release**.
2. When asked about app signing, choose **Use Google-generated key** (Play App Signing). Your upload key from step 4 only proves uploads come from you.
3. Upload `app-release.aab`, add release notes ("First release"), **Save → Review release → Start rollout**.
4. **Testers** tab → create an email list with yourself → copy the opt-in link, open it on your phone and install from Play. Check ads (test ads in debug builds, real ones here), notifications, sync and the widget.

### 10. Create the SubTrack Plus product
Needs the uploaded build from step 9 (it declares billing).
1. Set up a **payments profile** if prompted (**Settings → Payments profile**).
2. **Monetise with Play → Products → In-app products → Create product**.
3. Product ID **`subtrack_plus`** (must match exactly), name "SubTrack Plus", description "Remove ads, forever." Set a price (suggestion: $4.99; it's one-off). **Save → Activate**.
4. To test purchases without paying: **Settings → License testing** → add your Gmail.

### 11. Store listing
**Grow users → Store presence → Main store listing**. Copy text from **[STORE_LISTING.md](STORE_LISTING.md)**.
- App icon 512×512: `assets/play-store-icon.png`
- Feature graphic 1024×500 (make it in Canva: the icon and "Know what you pay for" on the green `#2F6B5E`)
- Phone screenshots, at least 2 (aim for 4–6): open the web app on your phone or in Chrome's device mode, load sample data, and capture Subscriptions, Insights, a subscription detail and Budget
- **Store settings**: category **Finance**, tags, contact email, website = your web app URL

### 12. App content (Policy → App content): answer every item
- **Privacy policy**: `https://<user>.github.io/<repo>/privacy.html`
- **App access**: choose **All functionality is available without special access**. Sign-in is optional (only for sync) and the app works fully without it.
- **Ads**: Yes, the app contains ads.
- **Content rating**: questionnaire → category Utility/Productivity, no to violence/sexual/etc. → expect "Everyone" / PEGI 3.
- **Target audience**: 18 and over (simplest with ads; avoids the Families policy).
- **News app**: No. **Health**: No. **Government**: No.
- **Financial features**: SubTrack doesn't move money or link bank accounts. Choose the option that it provides none of the listed financial services (or "budgeting/money management" if it's offered as a category).
- **Data safety**:
  | Data type | Collected? | Notes |
  |---|---|---|
  | Email address | Yes (optional) | Account management; not shared |
  | Other user-generated content (your subscriptions) | Yes (optional, when syncing) | App functionality; not shared |
  | Device or other IDs | Yes | Advertising, via AdMob; shared with Google |
  | App interactions / diagnostics | Yes | Via AdMob for ads and analytics |
  | Approximate location | Yes | From IP, via AdMob |
  - Data is encrypted in transit: **Yes**
  - Users can request deletion: **Yes**, in-app (**Settings → Sync → Delete account**) and on the web
- **Account deletion URL** (required because the app has accounts): `https://<user>.github.io/<repo>/`, with the note "Open Settings → Sync → Delete account, or email <support email>".

---

## Phase 4: Closed testing ⏱ (14+ days)

New **personal** developer accounts must run a closed test with **at least 12 testers opted in for 14 days in a row** before they can apply for production. Organisation accounts can skip to Phase 5.

1. **Testing → Closed testing → Create track** (or use "Alpha") → **Create release** → reuse the same AAB → roll out.
2. **Testers**: add a Google Group or email list of 12+ people (friends, family, a subreddit like r/AndroidAppTesters, tester-exchange communities). Share the opt-in link; each person must accept and install.
3. Keep them opted in for 14 days. Ask them to actually use it, and push fixes as new releases (bump `version` and `android.versionCode` in `app.json` each time).
4. After 14 days, **Dashboard → Apply for production**: answer the questions about your testing (what you learned, what you changed).
5. Google reviews the application ⏱ (usually up to 7 days).

---

## Phase 5: Production launch

1. **Test and release → Production → Create new release** → choose the latest AAB (from your library) → release notes.
2. Pick **countries/regions** (start broad; Plus pricing converts automatically).
3. Use a **staged rollout** of 20%, then raise it to 100% after a few days if crash-free.
4. **Send for review** ⏱ (hours to a few days for a first app).
5. When it's live: in AdMob, **link the app to its Play listing** (Apps → App settings), so ads serve at full rates.

## After launch
- Watch **Android vitals** (crashes/ANRs) and reply to reviews in Play Console.
- Watch Supabase usage (free tier: 50k monthly users, 500 MB database).
- Each update: bump `version` + `android.versionCode`, push to `main`, download the AAB, and upload it as a new production release.
