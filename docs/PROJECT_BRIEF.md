# SubTrack: project brief

Everything needed to continue work on SubTrack: what it is, how it's built, what's been decided, where things stand, and what's next. Last updated 24 October 2026.

## What it is
A minimalist subscription tracker for **Android (Google Play)** and the **web**, from one Expo / React Native codebase. Positioning: *"Every subscription. No bank login. No subscription."* Local-first and private, with optional cloud sync.

- **Repo:** https://github.com/letsdothis4991-ui/subtrack (public, branch `main`)
- **Website:** https://letsdothis4991-ui.github.io/subtrack/ (landing page), with the web app at `/subtrack/app/`, 45 cancellation guides at `/subtrack/cancel/`, and the privacy policy at `/subtrack/privacy.html`
- **Android package:** `com.reshpow.subtrack` (fixed forever once uploaded to Play)
- **Support email:** letsdothis4991@gmail.com (public, in the privacy policy and store listing)

## Features (all built)
- **Subscriptions:** cost, currency, billing cycle (weekly/monthly/quarterly/yearly, every N), next renewal, free-trial flag, category, "Why I have it" notes, manage-account link, optional annual-plan price. 45 popular-service presets with logos and manage links. Logos come from simple-icons; missing brands fall back to coloured initials.
- **List:** Active and Past tabs; search; sort; **category filter chips**; **swipe right to archive** (restore on Past), **swipe left to delete**, with an **Undo** bar. Cancelling or archiving moves a subscription to Past immediately ("access until" if still running).
- **Reminders:** a local notification N days before each renewal or trial end, on a **high-importance channel (pops up on screen)**. Permission is requested once a reminder exists. Settings has "Send a test reminder". There's also a monthly check-in nudge on the 1st. Reminders roll forward each time the app opens (120-day window).
- **Multi-currency:** a currency per subscription plus a base currency. Daily ECB rates come from api.frankfurter.app, with built-in fallback rates (31 currencies).
- **Insights:** Ways to save (cancel candidates from check-ins, switch-to-annual savings, price rises in the last 12 months), spend by category (donut), monthly spend (12 months back plus 6 projected), biggest subscriptions, next 30 days, billing-cycle split, history, and shared-plan totals.
- **Budgets:** an overall monthly budget and per-category budgets (using monthly equivalents).
- **Shared plans:** split equally, I pay (others owe me), or they pay; a "count only my share" setting; **settle-up** per renewal with share-sheet reminders.
- **Past subscriptions** keep price history and total paid.
- **Monthly check-in** ("Often / Sometimes / Not at all") feeds the cancel suggestions.
- **Data:** offline-first (zustand + AsyncStorage/localStorage); JSON backup/restore; CSV import (review step) and export.
- **Optional cloud sync** (Supabase, email 6-digit code; Google sign-in on web): newest-edit-wins merge with delete tombstones, and account deletion. Hidden unless `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` are set; **not set up yet**.
- **Android home-screen widget:** monthly total and next 3 renewals.
- **In-app review prompt** (Google Play): after archiving or cancelling, or a check-in. Never in the first 3 days, and at most every 120 days.
- **Monetisation:** one anchored **AdMob banner** on the Subscriptions and Insights tabs only (GDPR/US consent via UMP; error boundary so ads can't crash the app). **SubTrack Plus** is a one-off in-app product `subtrack_plus` (expo-iap). Plus = no ads + **renewal calendar** + **year in review** (shareable) + **6 colour themes** + **widget styles**. Free users see previews with an upgrade prompt. "Redeem a code" opens Google Play's redeem screen. Plus is re-checked on launch and on foreground, and out-of-app purchases are acknowledged.
- **No AI features** (removed deliberately to keep running costs at zero; still in git history).

## Decisions made with the owner
- Stack: Expo SDK 58 / React Native 0.88 / Expo Router / TypeScript. One codebase for Android and web.
- Local-first; sync is optional and comes later.
- Ads: light, Subscriptions and Insights tabs only; never on Settings, forms, the detail screen or the check-in. Budget-tab banner offered but not added.
- Plus price: **$1.99 launch price → $2.99 later** (set in Play Console).
- Discounts: Google Play promo codes (free Plus) and scheduled sale prices; no homemade code system.
- Repo is public (free GitHub Pages and Actions).
- No custom app icons (risky native setup); revisit later.

## Project layout
```
app/                      Expo Router screens
  (tabs)/                 index (Subscriptions), insights, budget, settings
  edit.tsx                add/edit + preset picker
  subscription/[id].tsx   detail, settle-up, price history
  import.tsx              CSV import
  check-in.tsx            monthly check-in
  calendar.tsx, year.tsx  Plus screens
src/lib/                  pure logic with unit tests (dates, calc, currency, sync merge, CSV, insights, presets)
src/services/             platform code; *.web.ts = web versions (notifications, ads, purchases, files, sync, review, supabase)
src/components/           UI kit, charts (SVG/Views), SwipeRow, Toast, PlusGate, pickers, account
src/widget/               Android widget
plugins/                  Expo config plugins (WebView cookie warm-up)
supabase/                 SQL schema + delete-account edge function
scripts/                  build-site.ts (landing + cancel guides), store-screenshots.mjs, gen-logos.mjs
assets/store/             Play screenshots (1080×1920 ×6) + feature graphic
.github/workflows/        ci, android (APK + AAB), smoke (emulator test), pages (website)
```

## Build, test and release
- `npm test` (21 unit tests), `npm run typecheck`, `npm run web`.
- **Android builds run in GitHub Actions** (`android.yml`, ~30 min) and produce `subtrack-apk` (test install) and `subtrack-aab` (Play upload; signed when the upload-key secrets exist). Docs, script and store-asset changes don't trigger a build.
- **`smoke.yml`** runs automatically after each Android build. It installs the APK on an API 34 emulator, taps through screens, swipes a row, sends a test reminder (checks channel importance 4), and pushes logs and screenshots to the **`smoke-logs`** branch (read it with `git fetch origin smoke-logs`). It can also be dispatched with a `run_id`.
- **`pages.yml`** builds the web app into `dist/app` (`EXPO_BASE_URL=/subtrack/app`), runs `scripts/build-site.ts` for the landing page, guides and sitemap, generates `privacy.html`, and deploys to GitHub Pages.
- Release steps are in **docs/LAUNCH_GUIDE.md**; cloud setup is in **docs/CLOUD_SETUP.md**.

## Crashes found and fixed (keep these protections)
1. R8 stripped WorkManager's `WorkDatabase_Impl` → ProGuard keep rules via `expo-build-properties` in `app.json`.
2. WebView `CookieManager` crashed (SIGTRAP) on the first network request from an OkHttp thread → `plugins/with-webview-warmup.js` initialises it on the main thread, and the first rates fetch waits 3 s.
3. Empty AdMob banner ID from an unset CI secret → validate the ID and fall back to the test ID; the banner sits inside an error boundary.

## Status (24 Oct 2026)
- The app builds and passes the emulator smoke test. The latest APKs are on the GitHub Actions run pages (Artifacts → `subtrack-apk`).
- The website is live with a landing page, 45 guides, a sitemap and the privacy page.
- **Not done yet (owner):** Google Play developer account and verification; AdMob account and IDs; upload key and GitHub secrets; Supabase project (optional); Play Console listing, `subtrack_plus` product, closed test with 12 testers for 14 days; then production. Set the GitHub variable `PLAY_URL` at launch to switch the site's buttons on.

## Suggested next steps
1. Owner: the Play Console and AdMob setup above (LAUNCH_GUIDE.md).
2. Before launch: a gentle Plus prompt after "found savings" moments; a first-run setup (currency plus multi-select popular services).
3. Marketing: Reddit/forum story posts, short videos, launch in January ("new year money audit"), Product Hunt, AlternativeTo, Search Console sitemap submission, promo codes per forum with UTM links.
4. Later: web push reminders (PWA), server-side Play purchase verification, translations, iOS.

## GitHub secrets and variables (to add when ready)
Secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ADMOB_ANDROID_APP_ID`, `EXPO_PUBLIC_ADMOB_BANNER_ID`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Variable: `PLAY_URL`.
