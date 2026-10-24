# Releasing to Google Play

## One-time setup

1. **Google Play developer account** ($25 one-off): https://play.google.com/console
2. **Create the app** in Play Console. Package name: `com.reshpow.subtrack` (change `android.package` in `app.json` first if you want a different one; it can't be changed after the first upload).
3. **Upload key**: generate one and keep it safe, outside the repo:
   ```bash
   keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 upload.jks   # copy the output
   ```
   In GitHub → Settings → Secrets → Actions add: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`), `ANDROID_KEY_PASSWORD`.
   Turn on **Play App Signing** when you upload the first bundle (Google holds the real signing key).
4. **AdMob** (https://admob.google.com): create an Android app and one **Banner** ad unit. Add secrets:
   - `ADMOB_ANDROID_APP_ID` (looks like `ca-app-pub-XXXX~YYYY`)
   - `EXPO_PUBLIC_ADMOB_BANNER_ID` (looks like `ca-app-pub-XXXX/ZZZZ`)

   Without these, builds use Google's test IDs (test ads, no revenue). In AdMob → Privacy & messaging, create a **GDPR** message and a **US states** message; the app already shows them.
5. **Remove-ads product**: Play Console → Monetize → In-app products → create a one-time product with ID **`remove_ads`** (e.g. $2.99). This needs a payments profile and at least one uploaded build.
6. **Web app**: GitHub → Settings → Pages → Source: **GitHub Actions**. It deploys to `https://<user>.github.io/<repo>/`.
7. **Privacy policy**: Play requires a public URL. Use the GitHub link to `docs/PRIVACY.md` (or the Pages site); it's already linked in Settings. Put your support email in it first.

## Each release

1. Bump `version` and `android.versionCode` in `app.json`.
2. Push to `main`. The **Android build** workflow produces `subtrack-aab` (and a test APK).
3. Download the `.aab` from the workflow run → Play Console → Testing → **Internal testing** → upload.
4. Promote to Closed testing, then Production. New personal developer accounts must run a **closed test with 12+ testers for 14 days** before production access.

## Play Console forms (answers for this app)

- **Ads**: Yes, contains ads.
- **Data safety**: Collected by AdMob: device or other IDs, app interactions, approximate location (from IP), for advertising and analytics, shared with Google. Data you enter in the app is not collected (it stays on the device). Data encrypted in transit: yes. Deletion: users can erase all data in Settings.
- **Content rating**: Utility/productivity, no objectionable content.
- **Target audience**: 18+ (simplest with ads; avoids Families policy).
- **Financial features**: none (it doesn't handle money or link to bank accounts).
- **Notifications permission**: requested from Settings → Reminders; used for renewal reminders only.

## Optional: EAS instead of GitHub Actions

`eas.json` is included if you prefer Expo's cloud builds: `npx eas-cli@latest build -p android --profile production`, then `eas submit`.
