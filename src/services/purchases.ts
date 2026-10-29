import { useEffect } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import {
  finishTransaction,
  getAvailablePurchases,
  getUserFriendlyErrorMessage,
  initConnection,
  isUserCancelledError,
  useIAP,
} from 'expo-iap';
import { useStore } from '../store';

/**
 * One-time, non-consumable product that unlocks SubTrack Plus (removes ads).
 * Create it in Play Console → Monetize → In-app products with this exact ID.
 */
export const PLUS_SKU = 'subtrack_plus';

export const purchasesSupported = Platform.OS === 'android' || Platform.OS === 'ios';

let lastErrorAt = 0;

/** Tells the user why a purchase didn't go through, instead of failing silently. Cancelling isn't an error. */
function reportPurchaseError(e: unknown) {
  if (isUserCancelledError(e)) return;
  // The same failure can arrive as both a rejected promise and an error event.
  if (Date.now() - lastErrorAt < 2000) return;
  lastErrorAt = Date.now();
  const code = (e as { code?: string })?.code;
  Alert.alert("Purchase didn't go through", `${getUserFriendlyErrorMessage(e as Error)}${code ? `\n\n(${code})` : ''}`);
}

export function usePlusPurchase() {
  const updateSettings = useStore((s) => s.updateSettings);
  const { connected, products, fetchProducts, requestPurchase, finishTransaction, getAvailablePurchases, availablePurchases } =
    useIAP({
      onPurchaseSuccess: async (purchase) => {
        if (purchase.productId === PLUS_SKU) {
          updateSettings({ plus: true });
          await finishTransaction({ purchase, isConsumable: false });
        }
      },
      onPurchaseError: reportPurchaseError,
    });

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: [PLUS_SKU], type: 'in-app' }).catch(() => {});
    getAvailablePurchases().catch(() => {});
  }, [connected]);

  // Re-grant on reinstall / new device.
  useEffect(() => {
    if (availablePurchases.some((p) => p.productId === PLUS_SKU)) updateSettings({ plus: true });
  }, [availablePurchases]);

  const product = products.find((p) => p.id === PLUS_SKU);

  return {
    available: connected && !!product,
    price: product?.displayPrice ?? null,
    buy: () =>
      requestPurchase({
        type: 'in-app',
        request: { google: { skus: [PLUS_SKU] }, apple: { sku: PLUS_SKU } },
      }).catch(reportPurchaseError),
    restore: () => getAvailablePurchases().catch(() => {}),
  };
}

/**
 * Looks for an existing Plus purchase (a reinstall, a new phone, or a promo code redeemed in the
 * Play Store app) and unlocks Plus. Purchases made outside the app must be acknowledged within
 * 3 days or Google refunds them, so unacknowledged ones are finished here too.
 * Never removes Plus: a failed or offline check leaves it as it was.
 */
export async function restorePlus(): Promise<boolean> {
  try {
    await initConnection();
    const purchases = await getAvailablePurchases();
    const plus = purchases.find((p) => p.productId === PLUS_SKU);
    if (!plus) return false;
    if (Platform.OS === 'android' && 'isAcknowledgedAndroid' in plus && plus.isAcknowledgedAndroid === false) {
      await finishTransaction({ purchase: plus, isConsumable: false });
    }
    if (!useStore.getState().settings.plus) useStore.getState().updateSettings({ plus: true });
    return true;
  } catch {
    return false;
  }
}

/** Checks for Plus when the app starts and whenever it comes back to the foreground (e.g. after redeeming a code). */
export function usePlusRestore() {
  useEffect(() => {
    if (!purchasesSupported) return;
    let last = 0;
    const check = () => {
      if (Date.now() - last < 30_000) return;
      last = Date.now();
      restorePlus();
    };
    check();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => sub.remove();
  }, []);
}

/** Opens Google Play's "Redeem code" screen (optionally pre-filled). */
export function openRedeem(code?: string) {
  const url = code ? `https://play.google.com/redeem?code=${encodeURIComponent(code)}` : 'https://play.google.com/redeem';
  return Linking.openURL(url);
}
