// Initialises WebView's CookieManager on the main thread at startup.
// React Native's networking otherwise touches it first from a background (OkHttp) thread,
// which crashes some WebView versions with SIGTRAP on the app's first network request.
const { withMainApplication } = require('expo/config-plugins');

const MARKER = 'CookieManager.getInstance()';

module.exports = function withWebViewWarmup(config) {
  return withMainApplication(config, (c) => {
    let src = c.modResults.contents;
    if (!src.includes(MARKER)) {
      const isKotlin = c.modResults.language === 'kt';
      const line = isKotlin
        ? `\n    try { android.webkit.CookieManager.getInstance() } catch (e: Throwable) {}`
        : `\n    try { android.webkit.CookieManager.getInstance(); } catch (Throwable e) {}`;
      const next = src.replace(/(super\.onCreate\(\);?)/, `$1${line}`);
      if (next === src) throw new Error('with-webview-warmup: could not find super.onCreate() in MainApplication');
      src = next;
    }
    c.modResults.contents = src;
    return c;
  });
};
