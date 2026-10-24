/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toCSV } from './backup';
import { draftNextRenewal, draftsFromCSV, parseCSV } from './importing';
import { DEFAULT_CATEGORIES } from './presets';
import { normaliseSubscription } from './sync';

test('parses quotes, escaped quotes and embedded commas', () => {
  assert.deepEqual(parseCSV('a,b\n"x, y","say ""hi"""\n'), [['a', 'b'], ['x, y', 'say "hi"']]);
  assert.deepEqual(parseCSV('a;b\r\n1;2'), [['a', 'b'], ['1', '2']]);
});

test('round-trips our own CSV export', () => {
  const s = normaliseSubscription({
    id: '1', name: 'Netflix, Premium', amount: 15.49, currency: 'GBP', cycle: 'monthly', interval: 1,
    anchorDate: '2026-11-05', startDate: '2025-01-05', categoryId: 'streaming', notes: 'For "The Crown"',
  });
  const { drafts } = draftsFromCSV(toCSV([s], DEFAULT_CATEGORIES), DEFAULT_CATEGORIES, 'USD');
  assert.equal(drafts.length, 1);
  assert.deepEqual(
    { name: drafts[0].name, amount: drafts[0].amount, currency: drafts[0].currency, category: drafts[0].category, next: drafts[0].nextRenewal },
    { name: 'Netflix, Premium', amount: 15.49, currency: 'GBP', category: 'streaming', next: '2026-11-05' },
  );
});

test('generic spreadsheets with symbols and day-first dates', () => {
  const csv = 'Service,Price,Frequency,Next payment\nSpotify,£11.99,Monthly,03/12/2026\nAdobe,"€1.234,56",Annual,2027-01-09\n,5,monthly,\n';
  const { drafts, skipped } = draftsFromCSV(csv, DEFAULT_CATEGORIES, 'USD');
  assert.equal(skipped, 1);
  assert.deepEqual(drafts.map((d) => [d.name, d.amount, d.currency, d.cycle, d.nextRenewal, d.category]), [
    ['Spotify', 11.99, 'GBP', 'monthly', '2026-12-03', 'music'],
    ['Adobe', 1234.56, 'EUR', 'yearly', '2027-01-09', 'other'],
  ]);
});

test('past dates roll forward to the next renewal', () => {
  const d = { name: 'X', amount: 1, currency: 'USD', cycle: 'monthly' as const, interval: 1, nextRenewal: '2026-08-15', isTrial: false, category: 'other' };
  assert.equal(draftNextRenewal(d, '2026-10-24'), '2026-11-15');
  assert.equal(draftNextRenewal({ ...d, nextRenewal: null }, '2026-10-24'), '2026-11-24');
});
