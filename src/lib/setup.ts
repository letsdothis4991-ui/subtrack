import { nthBilling, today } from './dates';
import type { ServicePreset } from './presets';
import type { Cycle, ISODate, Subscription } from './types';

type NewSubscription = Omit<Subscription, 'id' | 'priceHistory' | 'createdAt' | 'updatedAt' | 'usage' | 'settlements'>;

/** One service picked during first-run setup, with the details the user filled in. */
export interface SetupPick {
  preset: ServicePreset;
  amount: string;
  cycle: Cycle;
  next: ISODate | null;
}

/** Parses an amount typed by the user ("9,99" or "9.99"); null if it isn't a usable price. */
export function parseAmount(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number(s.trim().replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const pickComplete = (p: SetupPick) => parseAmount(p.amount) != null && p.next != null;

/** Turns a completed pick into a new subscription, with the same defaults as the add screen. */
export function subscriptionFromPick(p: SetupPick, currency: string, reminderDays: number | null, on: ISODate = today()): NewSubscription | null {
  const amount = parseAmount(p.amount);
  if (amount == null || !p.next) return null;
  const defaultStart = nthBilling(p.next, p.cycle, 1, -1);
  const startDate = defaultStart < on ? defaultStart : on;
  return {
    name: p.preset.name,
    amount,
    currency,
    cycle: p.cycle,
    interval: 1,
    anchorDate: p.next,
    startDate: startDate > p.next ? p.next : startDate,
    endDate: null,
    categoryId: p.preset.categoryId,
    notes: '',
    manageUrl: p.preset.manageUrl,
    reminderDays,
    isTrial: false,
    color: p.preset.color,
    logo: p.preset.logo ?? null,
    annualPrice: null,
    sharedWith: [],
    shareMode: 'split',
  };
}
