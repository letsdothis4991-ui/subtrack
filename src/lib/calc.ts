import { convert } from './currency';
import { addMonths, daysBetween, endOfMonth, monthKey, nthBilling, periodMonths, startOfMonth, today } from './dates';
import type { Category, ISODate, PricePoint, Rates, Subscription } from './types';

export function isShared(s: Subscription): boolean {
  return (s.sharedWith?.length ?? 0) > 0 || s.shareMode === 'they_pay';
}

/** Fraction of the price that is mine to pay. */
export function myShareFactor(s: Subscription): number {
  const others = s.sharedWith?.length ?? 0;
  if (s.shareMode === 'they_pay') return 0;
  if (s.shareMode === 'split' && others > 0) return 1 / (others + 1);
  return 1;
}

/** Fraction of the price the others owe me (only when I pay for everyone). */
export function owedFactor(s: Subscription): number {
  const others = s.sharedWith?.length ?? 0;
  return s.shareMode === 'i_pay' && others > 0 ? others / (others + 1) : 0;
}

/** The subscription as it costs me: prices scaled to my share. Feed this to the totals and charts. */
export function asMyShare(s: Subscription): Subscription {
  const f = myShareFactor(s);
  if (f === 1) return s;
  return { ...s, amount: s.amount * f, priceHistory: s.priceHistory.map((p) => ({ ...p, amount: p.amount * f })) };
}

/** Past = cancelled (archived), even if access continues until the end date. */
export function isPast(s: Subscription, _on: ISODate = today()): boolean {
  return s.endDate != null;
}

export function isActive(s: Subscription, on: ISODate = today()): boolean {
  return !isPast(s, on) && s.startDate <= on;
}

function firstK(s: Subscription, from: ISODate): number {
  const periodDays = periodMonths(s.cycle, s.interval) * 30.44;
  return Math.floor(daysBetween(s.anchorDate, from) / periodDays) - 2;
}

/** Billing dates in [from, to], clipped to the subscription's start and end. */
export function billingDates(s: Subscription, from: ISODate, to: ISODate): ISODate[] {
  const lo = from > s.startDate ? from : s.startDate;
  const hi = s.endDate && s.endDate < to ? s.endDate : to;
  if (lo > hi) return [];
  const out: ISODate[] = [];
  for (let k = firstK(s, lo); ; k++) {
    const d = nthBilling(s.anchorDate, s.cycle, s.interval, k);
    if (d > hi) break;
    if (d >= lo) out.push(d);
  }
  return out;
}

/** Next billing date on or after `from`, or null if the subscription ends first. */
export function nextRenewal(s: Subscription, from: ISODate = today()): ISODate | null {
  const hi = s.endDate ?? addMonths(from, 12 * periodMonths(s.cycle, s.interval) + 12);
  const lo = from > s.startDate ? from : s.startDate;
  for (let k = firstK(s, lo); ; k++) {
    const d = nthBilling(s.anchorDate, s.cycle, s.interval, k);
    if (d > hi) return null;
    if (d >= lo) return d;
  }
}

export function priceAt(s: Subscription, date: ISODate): PricePoint {
  let current: PricePoint | undefined;
  for (const p of s.priceHistory) {
    if (p.from <= date && (!current || p.from >= current.from)) current = p;
  }
  return current ?? s.priceHistory[0] ?? { from: s.startDate, amount: s.amount, currency: s.currency };
}

/** Current cost normalised to one month, in `base`. */
export function monthlyCost(s: Subscription, base: string, rates: Rates): number {
  return convert(s.amount, s.currency, base, rates) / periodMonths(s.cycle, s.interval);
}

export interface Charge {
  sub: Subscription;
  date: ISODate;
  /** In base currency. */
  amount: number;
}

export function charges(subs: Subscription[], from: ISODate, to: ISODate, base: string, rates: Rates): Charge[] {
  const out: Charge[] = [];
  for (const s of subs) {
    for (const date of billingDates(s, from, to)) {
      const p = priceAt(s, date);
      out.push({ sub: s, date, amount: convert(p.amount, p.currency, base, rates) });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Everything paid so far (start → today or end), in base currency. */
export function lifetimeSpend(s: Subscription, base: string, rates: Rates, on: ISODate = today()): number {
  return charges([s], s.startDate, on, base, rates).reduce((sum, c) => sum + c.amount, 0);
}

export interface MonthPoint {
  key: string;
  total: number;
  /** True for months after the current one (projected from active subscriptions). */
  projected: boolean;
  byCategory: Record<string, number>;
}

/** Actual charges per calendar month: `back` months of history, the current month, `ahead` months projected. */
export function monthlySeries(
  subs: Subscription[],
  base: string,
  rates: Rates,
  back = 11,
  ahead = 0,
  on: ISODate = today(),
): MonthPoint[] {
  const first = startOfMonth(addMonths(on, -back));
  const last = endOfMonth(addMonths(on, ahead));
  const nowKey = monthKey(on);
  const points = new Map<string, MonthPoint>();
  for (let i = -back; i <= ahead; i++) {
    const key = monthKey(addMonths(startOfMonth(on), i));
    points.set(key, { key, total: 0, projected: key > nowKey, byCategory: {} });
  }
  for (const c of charges(subs, first, last, base, rates)) {
    const p = points.get(monthKey(c.date));
    if (!p) continue;
    p.total += c.amount;
    p.byCategory[c.sub.categoryId] = (p.byCategory[c.sub.categoryId] ?? 0) + c.amount;
  }
  return [...points.values()];
}

export interface CategoryTotal {
  category: Category;
  monthly: number;
  count: number;
}

export function categoryTotals(subs: Subscription[], categories: Category[], base: string, rates: Rates): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  const fallback: Category = { id: 'other', name: 'Other', color: '#9A9A94', budget: null };
  for (const s of subs) {
    const category = categories.find((c) => c.id === s.categoryId) ?? fallback;
    const t = map.get(category.id) ?? { category, monthly: 0, count: 0 };
    t.monthly += monthlyCost(s, base, rates);
    t.count += 1;
    map.set(category.id, t);
  }
  return [...map.values()].sort((a, b) => b.monthly - a.monthly);
}

export function totalMonthly(subs: Subscription[], base: string, rates: Rates): number {
  return subs.reduce((sum, s) => sum + monthlyCost(s, base, rates), 0);
}

export const CYCLE_LABEL: Record<Subscription['cycle'], [string, string]> = {
  weekly: ['week', 'weeks'],
  monthly: ['month', 'months'],
  quarterly: ['quarter', 'quarters'],
  yearly: ['year', 'years'],
};

export function cycleText(s: Pick<Subscription, 'cycle' | 'interval'>): string {
  const [one, many] = CYCLE_LABEL[s.cycle];
  return s.interval > 1 ? `every ${s.interval} ${many}` : `/${one === 'month' ? 'mo' : one === 'year' ? 'yr' : one === 'week' ? 'wk' : 'qtr'}`;
}
