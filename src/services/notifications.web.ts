import type { Rates, Settings, Subscription } from '../lib/types';

// The web app has no background scheduler; upcoming renewals are surfaced in-app instead.
export const notificationsSupported = false;

export async function ensurePermission(_ask: boolean): Promise<boolean> {
  return false;
}

export async function rescheduleReminders(_subs: Subscription[], _settings: Settings, _rates: Rates): Promise<void> {}

export function addReminderTapListener(_onOpen: (route: string) => void): () => void {
  return () => {};
}
