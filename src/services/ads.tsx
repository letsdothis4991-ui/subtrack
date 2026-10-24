import { useEffect, useState } from 'react';
import { View } from 'react-native';
import mobileAds, { AdsConsent, BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useStore } from '../store';

// Replace with your AdMob banner unit id before release (see docs/LAUNCH_GUIDE.md).
const BANNER_UNIT_ID = __DEV__ ? TestIds.ADAPTIVE_BANNER : process.env.EXPO_PUBLIC_ADMOB_BANNER_ID ?? TestIds.ADAPTIVE_BANNER;

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

/** A single, unobtrusive anchored banner. Renders nothing for Plus users. */
export function AdBanner() {
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
