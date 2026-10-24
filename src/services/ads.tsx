import { Component, useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import mobileAds, { AdsConsent, BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useStore } from '../store';

// Replace with your AdMob banner unit id before release (see docs/LAUNCH_GUIDE.md).
// An unset CI secret arrives as an empty string, so validate rather than just null-check.
const configuredBanner = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID?.trim() ?? '';
const BANNER_UNIT_ID = !__DEV__ && /^ca-app-pub-\d+\/\d+$/.test(configuredBanner) ? configuredBanner : TestIds.ADAPTIVE_BANNER;

let ready: Promise<boolean> | null = null;

/** Runs the UMP consent flow (GDPR/US states), then starts the SDK. Safe to call repeatedly. */
export function initAds(): Promise<boolean> {
  ready ??= (async () => {
    try {
      const info = await AdsConsent.gatherConsent();
      if (!info.canRequestAds) return false;
      await mobileAds().initialize();
      return true;
    } catch {
      return false;
    }
  })();
  return ready;
}

export async function showPrivacyOptions(): Promise<void> {
  try {
    await AdsConsent.showPrivacyOptionsForm();
  } catch {}
}

export const adsSupported = true;

/** Ads must never take the app down: if the ad view throws, render nothing instead. */
class AdErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** A single, unobtrusive anchored banner. Renders nothing for Plus users. */
export function AdBanner() {
  return (
    <AdErrorBoundary>
      <Banner />
    </AdErrorBoundary>
  );
}

function Banner() {
  const plus = useStore((s) => s.settings.plus);
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    if (plus) return;
    let alive = true;
    initAds().then((ok) => alive && setCanShow(ok));
    return () => {
      alive = false;
    };
  }, [plus]);

  if (plus || !canShow) return null;
  return (
    <View style={{ alignItems: 'center' }}>
      <BannerAd unitId={BANNER_UNIT_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
