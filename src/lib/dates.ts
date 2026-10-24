import type { Cycle, ISODate } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): ISODate {
  return toISO(new Date());
}

export function daysBetween(a: ISODate, b: ISODate): number {
  const ms = parseISO(b).getTime() - parseISO(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Adds months, clamping to the last day of the target month (Jan 31 + 1 → Feb 28). */
export function addMonths(s: ISODate, n: number): ISODate {
  const [y, m, d] = s.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ty = Math.floor(total / 12);
  const tm = total - ty * 12;
  const last = new Date(ty, tm + 1, 0).getDate();
  return `${ty}-${pad(tm + 1)}-${pad(Math.min(d, last))}`;
}

/** Billing date `k` periods away from `anchor` (k may be negative). */
export function nthBilling(anchor: ISODate, cycle: Cycle, interval: number, k: number): ISODate {
  switch (cycle) {
    case 'weekly':
      return addDays(anchor, 7 * interval * k);
    case 'monthly':
      return addMonths(anchor, interval * k);
    case 'quarterly':
      return addMonths(anchor, 3 * interval * k);
    case 'yearly':
      return addMonths(anchor, 12 * interval * k);
  }
}

/** Approximate length of one billing period in months, used for normalising. */
export function periodMonths(cycle: Cycle, interval: number): number {
  const base = { weekly: 12 / 52, monthly: 1, quarterly: 3, yearly: 12 }[cycle];
  return base * Math.max(1, interval);
}

export function monthKey(s: ISODate): string {
  return s.slice(0, 7);
}

export function startOfMonth(s: ISODate): ISODate {
  return `${s.slice(0, 7)}-01`;
}

export function endOfMonth(s: ISODate): ISODate {
  return addDays(addMonths(startOfMonth(s), 1), -1);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(key: string, withYear = false): string {
  const [y, m] = key.split('-').map(Number);
  return withYear ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
}

export function formatDate(s: ISODate, opts: { year?: boolean } = {}): string {
  const [y, m, d] = s.split('-').map(Number);
  const showYear = opts.year ?? y !== new Date().getFullYear();
  return `${d} ${MONTHS[m - 1]}${showYear ? ` ${y}` : ''}`;
}

export function relativeDays(n: number): string {
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n < 0) return `${-n} days ago`;
  if (n < 14) return `in ${n} days`;
  if (n < 60) return `in ${Math.round(n / 7)} weeks`;
  return `in ${Math.round(n / 30)} months`;
}
