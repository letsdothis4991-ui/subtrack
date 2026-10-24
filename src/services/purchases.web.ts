export const REMOVE_ADS_SKU = 'remove_ads';
export const purchasesSupported = false;
export function useRemoveAds() {
  return { available: false, price: null as string | null, buy: async () => {}, restore: async () => {} };
}
