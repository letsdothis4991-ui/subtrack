# Suggested improvements

## Shipped in v1.1
1. ✅ Cloud sync between phone and web (Supabase, email code or Google sign-in)
2. ✅ Smart add: CSV import, plus pasted-email reading with Claude (screenshot reading removed to keep costs down)
3. ✅ "Still using it?" monthly check-ins feeding cancel suggestions
4. ✅ SubTrack Plus one-off purchase (no ads + smart add)
5. ✅ Service logos and an Android home-screen widget
6. ✅ Price-rise alerts and annual-plan savings tips
7. ✅ Settle-up for shared plans

## Next up
8. **Reminders on the web**: make the site an installable PWA with web push, or send email reminders from Supabase (scheduled function). *M*
9. **Verify Plus purchases server-side** with the Google Play Developer API, so the smart-add entitlement can't be faked. *M*
10. **Background refresh on Android** so reminders roll forward even if the app isn't opened for months. *S*
11. **More currencies** beyond the 31 ECB ones (second rates source). *S*
12. **Pause a subscription**, plus clearer custom cycles ("every 4 weeks"). *S*
13. **Localisation** (Spanish, German, French, Portuguese) and a screen-reader pass on the charts. *M*
14. **Crash reporting** (Sentry) with privacy-respecting defaults. *S*
15. **iOS release**: the code supports it (StoreKit is wired through expo-iap); it needs an Apple developer account and a widget written for iOS. *M*
16. **Quarterly check of the manage-account links**, since services move their settings pages.

## Known limitations
- The Android build is compiled by GitHub Actions; this development environment couldn't reach Google's SDK servers. The web app was built and tested end to end, and all logic has unit tests.
- Ads, purchases, the widget and notifications must be checked on a real phone (internal testing track) before launch.
- The smart-add server function was typechecked against the real SDK but has not been run against the live Claude API yet. Test it once your Supabase project is set up.
