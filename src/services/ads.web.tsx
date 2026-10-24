// No ads on the web app.
export const adsSupported = false;
export async function initAds(): Promise<boolean> {
  return false;
}
export async function showPrivacyOptions(): Promise<void> {}
export function AdBanner() {
  return null;
}
