// Plus is bought in the Android app; on the web it unlocks through a synced account.
export const PLUS_SKU = 'subtrack_plus';
export const purchasesSupported = false;
export function usePlusPurchase() {
  return { available: false, price: null as string | null, buy: async () => {}, restore: async () => {} };
}
export async function restorePlus(): Promise<boolean> {
  return false;
}
export function usePlusRestore() {}
export function openRedeem(_code?: string) {}
