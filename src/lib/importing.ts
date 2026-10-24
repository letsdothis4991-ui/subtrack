import { CURRENCIES } from './currency';
import { addMonths, nthBilling, today } from './dates';
import { PRESETS } from './presets';
import type { Category, Cycle, ISODate } from './types';

/** A subscription found by CSV import or smart add, before the user confirms it. */
export interface Draft {
  name: string;
  amount: number;
  currency: string;
  cycle: Cycle;
  interval: number;
  nextRenewal: ISODate | null;
  isTrial: boolean;
  category: string;
}

/** RFC 4180-ish CSV parser (quotes, escaped quotes, commas/newlines in quotes, ; or tab separators). */
export function parseCSV(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const sep = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

const HEADERS: Record<keyof Draft | 'end', RegExp> = {
  name: /^(name|service|subscription|merchant|description|title)$/i,
  amount: /^(amount|price|cost|fee|monthly cost)$/i,
  currency: /^(currency|ccy)$/i,
  cycle: /^(cycle|billing( cycle| period)?|frequency|period|interval type)$/i,
  interval: /^(every|interval)$/i,
  nextRenewal: /^(next.*|renewal.*|due.*|next\/anchor date|date)$/i,
  isTrial: /^(trial|free trial)$/i,
  category: /^(category|type|tag)$/i,
  end: /^end$/i,
};

function toCycle(v: string): Cycle {
  const s = v.toLowerCase();
  if (/week/.test(s)) return 'weekly';
  if (/quarter|3 ?month/.test(s)) return 'quarterly';
  if (/year|annual|12 ?month/.test(s)) return 'yearly';
  return 'monthly';
}

function toAmount(v: string): { amount: number; currency: string | null } {
  const symbols: Record<string, string> = { $: 'USD', '£': 'GBP', '€': 'EUR', '¥': 'JPY', '₹': 'INR', 'A$': 'AUD', 'C$': 'CAD' };
  let currency: string | null = null;
  for (const [sym, code] of Object.entries(symbols)) if (v.includes(sym)) currency = code;
  const code = v.match(/\b[A-Z]{3}\b/)?.[0];
  if (code && CURRENCIES.some((c) => c.code === code)) currency = code;
  let num = v.replace(/[^0-9.,-]/g, '');
  // "1.234,56" → 1234.56 ; "12,99" → 12.99
  if (/,\d{1,2}$/.test(num)) num = num.replace(/\./g, '').replace(',', '.');
  else num = num.replace(/,/g, '');
  return { amount: Number(num), currency };
}

function toDate(v: string): ISODate | null {
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/); // day-first (most of the world)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    const [d, mo] = b > 12 ? [b, a] : [a, b];
    return `${m[3]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return null;
}

export function draftsFromCSV(text: string, categories: Category[], baseCurrency: string): { drafts: Draft[]; skipped: number } {
  const rows = parseCSV(text);
  if (rows.length < 2) return { drafts: [], skipped: 0 };
  const header = rows[0].map((h) => h.trim());
  const col = (k: keyof typeof HEADERS) => header.findIndex((h) => HEADERS[k].test(h));
  const idx = {
    name: col('name'), amount: col('amount'), currency: col('currency'), cycle: col('cycle'), interval: col('interval'),
    next: col('nextRenewal'), trial: col('isTrial'), category: col('category'), end: col('end'),
  };
  if (idx.name < 0 || idx.amount < 0) throw new Error('The CSV needs at least "Name" and "Amount" (or "Price") columns.');
  const drafts: Draft[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const name = r[idx.name]?.trim();
    const { amount, currency } = toAmount(r[idx.amount] ?? '');
    if (!name || !Number.isFinite(amount)) {
      skipped++;
      continue;
    }
    const catText = idx.category >= 0 ? (r[idx.category] ?? '').trim().toLowerCase() : '';
    const category =
      categories.find((c) => c.name.toLowerCase() === catText || c.id === catText)?.id ??
      PRESETS.find((p) => p.name.toLowerCase() === name.toLowerCase())?.categoryId ??
      'other';
    drafts.push({
      name,
      amount,
      currency: (idx.currency >= 0 && r[idx.currency]?.trim().toUpperCase()) || currency || baseCurrency,
      cycle: idx.cycle >= 0 ? toCycle(r[idx.cycle] ?? '') : 'monthly',
      interval: idx.interval >= 0 ? Math.max(1, Number(r[idx.interval]) || 1) : 1,
      nextRenewal: idx.next >= 0 ? toDate(r[idx.next] ?? '') : null,
      isTrial: idx.trial >= 0 ? /^(y|yes|true|1)$/i.test((r[idx.trial] ?? '').trim()) : false,
      category,
    });
  }
  return { drafts, skipped };
}

/** Next renewal for a draft with no date: one cycle from today. */
export function draftNextRenewal(d: Draft, on: ISODate = today()): ISODate {
  if (d.nextRenewal && d.nextRenewal >= on) return d.nextRenewal;
  if (d.nextRenewal) {
    // A past date is the last charge: roll forward.
    for (let k = 1; k < 1000; k++) {
      const next = nthBilling(d.nextRenewal, d.cycle, d.interval, k);
      if (next >= on) return next;
    }
  }
  return d.cycle === 'weekly' ? nthBilling(on, 'weekly', d.interval, 1) : addMonths(on, d.cycle === 'yearly' ? 12 : d.cycle === 'quarterly' ? 3 : 1);
}
