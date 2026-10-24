# Suggested improvements

Ranked by how much they'd help users and the business, set against effort.

## High impact

1. **Cloud sync between phone and web** (Supabase or Firebase, Google sign-in).
   You wanted web access, but each device currently holds its own data and export/import is manual. Sync is the biggest gap against Rocket Money and Tilla. The store is already a single serialisable state, so a sync layer slots in cleanly. *Effort: M. Also a natural paid feature.*
2. **Smart add: import from email, screenshots or CSV.**
   ReSubs' headline feature. Forward a receipt or share a screenshot, and an LLM (e.g. Claude) pulls out the name, price, currency and renewal date. Even plain CSV import (to match the existing CSV export) would ease onboarding. *Effort: S (CSV) to M (AI).*
3. **"Still using it?" check-ins and cost-per-use.**
   A monthly nudge: "Did you use Disney+ this month?" Low-use subscriptions are flagged as **cancel candidates** in Insights, next to your "why I have it" note. This is the core reason people install a tracker, and no competitor does it well. *Effort: S.*
4. **SubTrack Plus instead of only "Remove ads".**
   A one-off or low annual price for: no ads, cloud sync, widgets, smart import, unlimited history export. Bobby and Tilla show users happily pay a few dollars once; avoid weekly plans (reviewers are calling those out). *Effort: S on top of the existing billing code.*

## Medium impact

5. **Service logos** instead of coloured initials (bundle ~100 SVG logos for the presets). Biggest visual polish win. *S*
6. **Home-screen widget**: monthly total and next 3 renewals. *M*
7. **Price-rise alerts and an annual-vs-monthly savings tip**, e.g. "Spotify is $X/yr cheaper on annual". Price history already exists to build on. *S*
8. **Settle-up for shared plans**: mark each person as paid per renewal, share a "you owe me" message, and optionally invite them to see it (needs sync). *S–M*
9. **Reminders on the web**: make it an installable PWA with web push, or send email reminders once there's a backend. *M*
10. **Background refresh on Android**: reminders cover the next 120 days and roll forward whenever the app opens. A background task would keep them topped up for people who never open it. *S*

## Lower priority / housekeeping

11. **More currencies**: the free ECB feed covers 31; add a second rates source for the rest (e.g. AED, SAR, ARS, NGN).
12. **Pause a subscription** (some services allow it), and custom cycles such as "every 4 weeks" (possible today via weekly × 4, but not obvious).
13. **Localisation** (Spanish, German, French, Portuguese) and an accessibility pass (screen-reader labels on charts).
14. **Crash reporting** (Sentry), with privacy-respecting defaults.
15. **iOS release**: the code already supports it; it needs an Apple developer account ($99/yr) and App Store review.
16. **Verify the 45 manage-account links** on a real account each quarter, since services move their settings pages.

## Known limitations of this first version

- The Android build hasn't been compiled yet: this development environment couldn't reach Google's SDK servers. The GitHub Actions workflow builds it on the first push. The web version was built and tested end to end.
- Ads and the Remove-ads purchase use Google's test IDs until you add your AdMob IDs and create the `remove_ads` product (see RELEASE.md). Both need testing on a real device.
