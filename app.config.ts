import type { ConfigContext, ExpoConfig } from 'expo/config';

// Static config lives in app.json. This adds values that come from the environment:
// - EXPO_BASE_URL: path prefix for the web build (e.g. "/subtrack" on GitHub Pages)
// - ADMOB_ANDROID_APP_ID: your AdMob app id for release builds (defaults to Google's test id)
export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = (config.plugins ?? []).map((p) => {
    if (Array.isArray(p) && p[0] === 'react-native-google-mobile-ads' && process.env.ADMOB_ANDROID_APP_ID) {
      return [p[0], { ...p[1], androidAppId: process.env.ADMOB_ANDROID_APP_ID }] as [string, unknown];
    }
    return p;
  });
  return {
    ...config,
    name: config.name ?? 'SubTrack',
    slug: config.slug ?? 'subtrack',
    plugins,
    experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL ?? '' },
  };
};
