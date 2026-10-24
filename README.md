# SubTrack

A minimalist subscription tracker for Android and the web, built from one Expo / React Native codebase.

## Features

- **Subscriptions**: cost, billing cycle (weekly/monthly/quarterly/yearly, every N), next renewal, free-trial flag, payment method
- **Popular services** (45 presets): one tap fills in the name, category, colour and **manage account** link
- **Categories**: 10 defaults (Streaming, News, AI, Utilities…) plus your own, with colours
- **Multi-currency**: each subscription has its own currency; everything is converted to your **base currency** (daily ECB rates, works offline)
- **Renewal reminders**: a notification N days before each renewal or trial end (Android)
- **Insights**: spend by category (donut), monthly spend over 12 months plus 6 projected (stacked bars), biggest subscriptions, next 30 days, billing-cycle split, lifetime and last-12-months totals
- **Budgets**: an overall monthly budget plus optional per-category limits, with progress bars and an over-budget warning
- **Why I have it**: a notes field shown when you're deciding whether to cancel
- **Current and past subscriptions**: "Mark as cancelled" keeps the history ("Disney+ · $13.99/mo · Jan 2024 – Jun 2026 · paid $390"), plus price-change history
- **Shared subscriptions**: who you share with, and whether you split the cost, pay for everyone (shows what you're owed) or someone else pays. Totals can count only your share
- **Cloud sync** (optional): sign in with an emailed 6-digit code (or Google on the web) and your data syncs between the phone app and the website. Supabase with row-level security; newest-edit-wins merge with delete tombstones
- **Smart add**: import a CSV (free), or let Claude read a screenshot or pasted billing email and list the subscriptions for you to confirm (Plus)
- **Monthly check-in**: "Still using it?" (often / sometimes / not at all). Unused subscriptions show up under **Ways to save** with your "why I have it" note
- **Ways to save**: cancel candidates, savings from switching to an annual plan, and alerts for price rises in the last 12 months
- **Service logos** for 29 popular services (simple-icons), with coloured initials as the fallback
- **Home-screen widget** (Android): monthly total and next three renewals
- **Settle-up** for plans you pay for: tick off who has paid for each renewal, see what's owed, and send a reminder through the share sheet
- **Data**: works fully offline without an account; JSON backup/restore and CSV export
- **SubTrack Plus**: a one-off purchase that removes ads and unlocks smart add. Free users see one anchored AdMob banner (Subscriptions and Insights tabs only) with GDPR/US consent. No ads on the web

## Run it

```bash
npm install
npm run web          # web app at http://localhost:8081
npm run android      # dev build on a device/emulator (needs Android Studio)
npm test             # unit tests for billing/renewal maths
npm run typecheck
```

Expo Go can't load the ads/billing/widget native modules, so use a development build (`npx expo run:android`) or the APK from CI.

Cloud features need `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (in `.env.local` locally, GitHub secrets in CI). Without them the app runs offline-only. See [docs/CLOUD_SETUP.md](docs/CLOUD_SETUP.md).

## Builds

| Workflow | What it does |
| --- | --- |
| `.github/workflows/ci.yml` | Typecheck, unit tests and web build on every push |
| `.github/workflows/android.yml` | On `main`: builds a test **APK** and a Play Store **AAB** (signed if the upload-key secrets are set) as downloadable artifacts |
| `.github/workflows/pages.yml` | On `main`: deploys the web app to GitHub Pages |

See **[docs/LAUNCH_GUIDE.md](docs/LAUNCH_GUIDE.md)** for the step-by-step Play Store launch.

## Project layout

```
app/                 screens (Expo Router)
  (tabs)/            Subscriptions, Insights, Budget, Settings
  edit.tsx           add/edit form + service picker
  subscription/[id]  detail (settle-up, price history)
  smart-add.tsx      CSV / screenshot / email import
  check-in.tsx       monthly usage check-in
src/lib/             pure logic: dates, billing maths, currency, sync merge, CSV, insights (unit tested)
src/services/        platform code: notifications, ads, purchases, files, sync, smart add (*.web.ts = web version)
src/widget/          Android home-screen widget
supabase/            database schema and edge functions (smart add via Claude, account deletion)
src/components/      UI kit and charts (no chart library; SVG + Views)
src/store.ts         zustand store persisted to AsyncStorage / localStorage
```

## Docs

- [Competitor review](docs/COMPETITOR_REVIEW.md): the top 5 trackers this app is modelled on
- [Suggested improvements](docs/IMPROVEMENTS.md)
- [Launch guide (Google Play, step by step)](docs/LAUNCH_GUIDE.md)
- [Cloud setup (Supabase + Claude)](docs/CLOUD_SETUP.md)
- [Privacy policy](docs/PRIVACY.md)
- [Store listing copy](docs/STORE_LISTING.md)
