import { billingDates, isShared, owedFactor, priceAt } from './calc';
import { addMonths, today } from './dates';
import type { ISODate, Subscription, Usage } from './types';

/** Most recent check-in answers, newest first. */
export function usageHistory(s: Subscription): { month: string; usage: Usage }[] {
  return Object.entries(s.usage ?? {})
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, usage]) => ({ month, usage }));
}

export type CancelReason = 'unused' | 'rarely';

/** "Never" at the last check-in, or "sometimes" at the last two. */
export function cancelReason(s: Subscription): CancelReason | null {
  const [last, prev] = usageHistory(s);
  if (!last) return null;
  if (last.usage === 'never') return 'unused';
  if (last.usage === 'sometimes' && prev?.usage !== 'often' && prev) return 'rarely';
  return null;
}

export interface PriceChange {
  sub: Subscription;
  from: number;
  to: number;
  date: ISODate;
  /** Fractional change, e.g. 0.15 for +15%. */
  pct: number;
}

/** Price changes in the last `months` months, biggest rise first. */
export function recentPriceChanges(subs: Subscription[], months = 12, on: ISODate = today()): PriceChange[] {
  const since = addMonths(on, -months);
  const out: PriceChange[] = [];
  for (const s of subs) {
    const hist = [...s.priceHistory].sort((a, b) => a.from.localeCompare(b.from));
    for (let i = 1; i < hist.length; i++) {
      const [a, b] = [hist[i - 1], hist[i]];
      if (b.from < since || b.from > on || a.currency !== b.currency || a.amount === b.amount || a.amount <= 0) continue;
      out.push({ sub: s, from: a.amount, to: b.amount, date: b.from, pct: (b.amount - a.amount) / a.amount });
    }
  }
  return out.sort((x, y) => y.pct - x.pct);
}

/** Yearly saving from switching a monthly/quarterly/weekly plan to its annual price (in the subscription's currency). */
export function annualSaving(s: Subscription): number | null {
  if (s.cycle === 'yearly' || !s.annualPrice) return null;
  const perYear = { weekly: 52, monthly: 12, quarterly: 4 }[s.cycle] / Math.max(1, s.interval);
  const saving = s.amount * perYear - s.annualPrice;
  return saving > 0.005 ? saving : null;
}

export interface Settlement {
  date: ISODate;
  /** What each other person owes for this renewal. */
  perPerson: number;
  currency: string;
  paid: string[];
  unpaid: string[];
}

/** Renewals where I paid for others, newest first: the last `count`, since the subscription was added to SubTrack. */
export function settlements(s: Subscription, count = 3, on: ISODate = today()): Settlement[] {
  if (!isShared(s) || owedFactor(s) === 0) return [];
  const people = s.sharedWith;
  const tracked = s.createdAt.slice(0, 10);
  const from = addMonths(on, -24) > tracked ? addMonths(on, -24) : tracked;
  const dates = billingDates(s, from, on).slice(-count).reverse();
  return dates.map((date) => {
    const price = priceAt(s, date);
    const paid = (s.settlements?.[date] ?? []).filter((p) => people.includes(p));
    return {
      date,
      perPerson: price.amount / (people.length + 1),
      currency: price.currency,
      paid,
      unpaid: people.filter((p) => !paid.includes(p)),
    };
  });
}

/** Total still owed to me across the renewals shown in settle-up (in the subscription's currency). */
export function outstanding(s: Subscription, on: ISODate = today()): number {
  return settlements(s, 3, on).reduce((sum, x) => sum + x.perPerson * x.unpaid.length, 0);
}
