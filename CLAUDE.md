# SubTrack: notes for Claude

Read `AGENTS.md` (Expo rules) and `docs/PROJECT_BRIEF.md` (full context, decisions, status) first.

## Working rules for this repo
- Expo SDK 58: install native packages at the versions in `node_modules/expo/bundledNativeModules.json` (`npx expo install` may not reach its API from sandboxes).
- Keep app logic in `src/lib` pure and unit-tested (`npm test`); platform code goes in `src/services` with a `*.web.ts` twin.
- Before pushing: `npx tsc --noEmit` and `npm test`; for UI changes, also build the web app (`npx expo export --platform web`) and click through it.
- Android is built only in GitHub Actions (~30 min). After each build, `smoke.yml` runs the APK on an emulator; read results with `git fetch origin smoke-logs && git show origin/smoke-logs:summary.txt`. Don't send the owner an APK until the smoke test passes.
- Don't remove the crash protections listed in the brief (ProGuard keep rules, WebView warm-up plugin, ad error boundary).
- Ads stay on the Subscriptions and Insights tabs only. Plus = `settings.plus`, product id `subtrack_plus`.
- The owner is non-technical: explain in plain language, give step-by-step instructions, and say what was and wasn't tested.
