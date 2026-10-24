import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const KEY = 'subtrack-review';
const MIN_DAYS_INSTALLED = 3;
const MIN_DAYS_BETWEEN = 120;
const DAY = 86_400_000;

interface ReviewState {
  firstOpen: number;
  lastAsked: number | null;
}

async function load(): Promise<ReviewState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const fresh = { firstOpen: Date.now(), lastAsked: null };
  await AsyncStorage.setItem(KEY, JSON.stringify(fresh)).catch(() => {});
  return fresh;
}

/** Records the first launch so the prompt waits a few days. Call on app start. */
export function noteAppOpen() {
  load().catch(() => {});
}

/**
 * Shows Google Play's in-app review sheet after a positive moment (cancelling something,
 * finishing a check-in) — at most every few months, and never in the first few days.
 * Google also rate-limits the sheet itself, so it may not appear every time.
 * Resolves true when the sheet was requested.
 */
export async function maybeAskForReview(): Promise<boolean> {
  try {
    const st = await load();
    const now = Date.now();
    if (now - st.firstOpen < MIN_DAYS_INSTALLED * DAY) return false;
    if (st.lastAsked && now - st.lastAsked < MIN_DAYS_BETWEEN * DAY) return false;
    if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) return false;
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...st, lastAsked: now }));
    // Let the success feedback show first.
    setTimeout(() => StoreReview.requestReview().catch(() => {}), 1200);
    return true;
  } catch {
    return false;
  }
}
