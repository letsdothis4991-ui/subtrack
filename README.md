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
- **Data**: local-first (no account), JSON backup/restore, CSV export. Moves between the phone and web app via export/import
- **Monetisation**: one anchored AdMob banner (Subscriptions and Insights tabs only) with GDPR/US consent, plus a one-off **Remove ads** in-app purchase. No ads on the web

## Run it

```bash
npm install
npm run web          # web app at http://localhost:8081
npm run android      # dev build on a device/emulator (needs Android Studio)
npm test             # unit tests for billing/renewal maths
npm run typecheck
```

Expo Go can't load the ads/billing native modules, so use a development build (`npx expo run:android`) or the APK from CI.

## Builds

| Workflow | What it does |
| --- | --- |
| `.github/workflows/ci.yml` | Typecheck, unit tests and web build on every push |
| `.github/workflows/android.yml` | On `main`: builds a test **APK** and a Play Store **AAB** (signed if the upload-key secrets are set) as downloadable artifacts |
| `.github/workflows/pages.yml` | On `main`: deploys the web app to GitHub Pages |

See **[docs/RELEASE.md](docs/RELEASE.md)** for the Play Store checklist.

## Project layout

```
app/                 screens (Expo Router)
  (tabs)/            Subscriptions, Insights, Budget, Settings
  edit.tsx           add/edit form + service picker
  subscription/[id]  detail
src/lib/             pure logic: dates, billing maths, currency, presets (unit tested)
src/services/        platform code: notifications, ads, purchases, files (*.web.ts = web version)
src/components/      UI kit and charts (no chart library; SVG + Views)
src/store.ts         zustand store persisted to AsyncStorage / localStorage
```

## Docs

- [Competitor review](docs/COMPETITOR_REVIEW.md): the top 5 trackers this app is modelled on
- [Suggested improvements](docs/IMPROVEMENTS.md)
- [Release guide](docs/RELEASE.md)
- [Privacy policy](docs/PRIVACY.md)
- [Store listing copy](docs/STORE_LISTING.md)
