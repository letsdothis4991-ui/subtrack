import type { Rates } from './types';

/** Currencies with daily ECB reference rates (the set Frankfurter serves). */
export const CURRENCIES: { code: string; name: string }[] = [
  { code: 'USD', name: 'US dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British pound' },
  { code: 'AUD', name: 'Australian dollar' },
  { code: 'CAD', name: 'Canadian dollar' },
  { code: 'NZD', name: 'New Zealand dollar' },
  { code: 'JPY', name: 'Japanese yen' },
  { code: 'CHF', name: 'Swiss franc' },
  { code: 'SEK', name: 'Swedish krona' },
  { code: 'NOK', name: 'Norwegian krone' },
  { code: 'DKK', name: 'Danish krone' },
  { code: 'PLN', name: 'Polish złoty' },
  { code: 'CZK', name: 'Czech koruna' },
  { code: 'HUF', name: 'Hungarian forint' },
  { code: 'RON', name: 'Romanian leu' },
  { code: 'BGN', name: 'Bulgarian lev' },
  { code: 'ISK', name: 'Icelandic króna' },
  { code: 'TRY', name: 'Turkish lira' },
  { code: 'ILS', name: 'Israeli shekel' },
  { code: 'ZAR', name: 'South African rand' },
  { code: 'INR', name: 'Indian rupee' },
  { code: 'CNY', name: 'Chinese yuan' },
  { code: 'HKD', name: 'Hong Kong dollar' },
  { code: 'SGD', name: 'Singapore dollar' },
  { code: 'KRW', name: 'South Korean won' },
  { code: 'MYR', name: 'Malaysian ringgit' },
  { code: 'THB', name: 'Thai baht' },
  { code: 'IDR', name: 'Indonesian rupiah' },
  { code: 'PHP', name: 'Philippine peso' },
  { code: 'BRL', name: 'Brazilian real' },
  { code: 'MXN', name: 'Mexican peso' },
];

/** Offline fallback (approximate), per 1 EUR. Replaced by live rates when online. */
export const FALLBACK_RATES: Rates = {
  updatedAt: null,
  rates: {
    EUR: 1, USD: 1.08, GBP: 0.85, AUD: 1.65, CAD: 1.5, NZD: 1.8, JPY: 165, CHF: 0.95,
    SEK: 11.4, NOK: 11.7, DKK: 7.46, PLN: 4.3, CZK: 25, HUF: 395, RON: 4.97, BGN: 1.96,
    ISK: 150, TRY: 37, ILS: 4.0, ZAR: 19.8, INR: 92, CNY: 7.8, HKD: 8.4, SGD: 1.45,
    KRW: 1500, MYR: 4.8, THB: 38, IDR: 17500, PHP: 62, BRL: 6.0, MXN: 20,
  },
};

export function convert(amount: number, from: string, to: string, rates: Rates): number {
  if (from === to) return amount;
  const r = rates.rates;
  const f = from === 'EUR' ? 1 : r[from] ?? FALLBACK_RATES.rates[from];
  const t = to === 'EUR' ? 1 : r[to] ?? FALLBACK_RATES.rates[to];
  if (!f || !t) return amount;
  return (amount / f) * t;
}

export async function fetchRates(): Promise<Rates> {
  const res = await fetch('https://api.frankfurter.app/latest?from=EUR');
  if (!res.ok) throw new Error(`Rates request failed (${res.status})`);
  const json = (await res.json()) as { rates: Record<string, number> };
  return { rates: { EUR: 1, ...json.rates }, updatedAt: new Date().toISOString() };
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency: string, opts: { compact?: boolean } = {}): string {
  const key = `${currency}|${opts.compact ? 1 : 0}`;
  let f = formatters.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: opts.compact ? 0 : 2,
        minimumFractionDigits: opts.compact ? 0 : undefined,
      });
    } catch {
      f = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    }
    formatters.set(key, f);
  }
  return f.format(amount);
}
