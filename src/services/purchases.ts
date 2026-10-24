import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useIAP } from 'expo-iap';
import { useStore } from '../store';

/** One-time, non-consumable product. Create it in Play Console → Monetize → In-app products. */
export const REMOVE_ADS_SKU = 'remove_ads';

export const purchasesSupported = Platform.OS === 'android' || Platform.OS === 'ios';

export function useRemoveAds() {
  const updateSettings = useStore((s) => s.updateSettings);
  const { connected, products, fetchProducts, requestPurchase, finishTransaction, getAvailablePurchases, availablePurchases } =
    useIAP({
      onPurchaseSuccess: async (purchase) => {
        if (purchase.productId === REMOVE_ADS_SKU) {
          updateSettings({ adsRemoved: true });
          await finishTransaction({ purchase, isConsumable: false });
        }
      },
    });

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: [REMOVE_ADS_SKU], type: 'in-app' }).catch(() => {});
    getAvailablePurchases().catch(() => {});
  }, [connected]);

  // Re-grant on reinstall / new device.
  useEffect(() => {
    if (availablePurchases.some((p) => p.productId === REMOVE_ADS_SKU)) updateSettings({ adsRemoved: true });
  }, [availablePurchases]);

  const product = products.find((p) => p.id === REMOVE_ADS_SKU);

  return {
    available: connected && !!product,
    price: product?.displayPrice ?? null,
    buy: () =>
      requestPurchase({
        type: 'in-app',
        request: { google: { skus: [REMOVE_ADS_SKU] }, apple: { sku: REMOVE_ADS_SKU } },
      }).catch(() => {}),
    restore: () => getAvailablePurchases().catch(() => {}),
  };
}
