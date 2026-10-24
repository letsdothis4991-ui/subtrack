import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { canNudge, type NudgeState } from '../lib/nudge';
import { useStore } from '../store';
import { purchasesSupported } from './purchases';
import { maybeAskForReview } from './review';

const KEY = 'subtrack-plus-nudge';

export interface PlusOffer {
  kind: 'cancelled' | 'found';
  /** Yearly amount saved (or that could be saved), in the base currency. */
  yearly: number;
}

/** The Plus prompt waiting to show on the Subscriptions tab, if any. */
export const usePlusOffer = create<{ offer: PlusOffer | null; dismiss: () => void }>()((set) => ({
  offer: null,
  dismiss: () => set({ offer: null }),
}));

async function load(): Promise<NudgeState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const fresh: NudgeState = { firstOpen: Date.now(), shown: 0, lastShown: null };
  await AsyncStorage.setItem(KEY, JSON.stringify(fresh)).catch(() => {});
  return fresh;
}

/** Records the first launch so the prompt waits a few days. Call on app start. */
export function noteNudgeOpen() {
  load().catch(() => {});
}

/**
 * Call after a "found savings" moment. Asks for a Play review when that's due; otherwise,
 * now and then, offers Plus gently. Never both at once, and never to Plus users.
 */
export async function afterSaving(offer: PlusOffer): Promise<void> {
  try {
    if (await maybeAskForReview()) return;
    if (!purchasesSupported || useStore.getState().settings.plus || offer.yearly <= 0) return;
    const st = await load();
    const now = Date.now();
    if (!canNudge(st, now)) return;
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...st, shown: st.shown + 1, lastShown: now }));
    usePlusOffer.setState({ offer });
  } catch {}
}
