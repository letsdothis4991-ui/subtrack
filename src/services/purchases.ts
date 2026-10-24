import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useIAP } from 'expo-iap';
import { useStore } from '../store';

/**
 * One-time, non-consumable product that unlocks SubTrack Plus.
 * Create it in Play Console → Monetize → In-app products with this exact ID.
 */
export const PLUS_SKU = 'subtrack_plus';

export const purchasesSupported = Platform.OS === 'android' || Platform.OS === 'ios';

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
      }).catch(() => {}),
    restore: () => getAvailablePurchases().catch(() => {}),
  };
}
