/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { asMyShare, billingDates, isPast, myShareFactor, owedFactor, lifetimeSpend, monthlyCost, monthlySeries, nextRenewal, priceAt } from './calc';
import { convert, FALLBACK_RATES } from './currency';
import { addMonths } from './dates';
import type { Subscription } from './types';

const rates = FALLBACK_RATES;

function sub(over: Partial<Subscription> = {}): Subscription {
  return {
    id: 's1',
    name: 'Test',
    amount: 10,
    currency: 'USD',
    cycle: 'monthly',
    interval: 1,
    anchorDate: '2026-01-31',
    startDate: '2025-10-31',
    endDate: null,
    categoryId: 'streaming',
    notes: '',
    manageUrl: '',
    paymentMethod: '',
    reminderDays: 3,
    isTrial: false,
    color: null,
    sharedWith: [],
    shareMode: 'split',
    priceHistory: [{ from: '2025-10-31', amount: 10, currency: 'USD' }],
    createdAt: '2025-10-31T00:00:00Z',
    ...over,
  };
}

test('addMonths clamps to month end', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(addMonths('2026-01-15', -2), '2025-11-15');
});

test('next renewal does not drift after short months', () => {
  const s = sub();
  assert.equal(nextRenewal(s, '2026-03-01'), '2026-03-31');
  assert.equal(nextRenewal(s, '2026-03-31'), '2026-03-31');
  assert.equal(nextRenewal(s, '2026-04-01'), '2026-04-30');
});

test('next renewal is null once a cancelled sub has ended', () => {
  const s = sub({ endDate: '2026-02-15' });
  assert.equal(nextRenewal(s, '2026-02-01'), null);
  assert.equal(isPast(s, '2026-02-16'), true);
  assert.equal(isPast(s, '2026-02-10'), false);
});

test('billing dates are clipped to start and end', () => {
  const s = sub({ endDate: '2026-01-31' });
  assert.deepEqual(billingDates(s, '2025-01-01', '2026-12-31'), ['2025-10-31', '2025-11-30', '2025-12-31', '2026-01-31']);
});

test('yearly and multi-week cycles', () => {
  const y = sub({ cycle: 'yearly', anchorDate: '2026-06-01', startDate: '2024-06-01' });
  assert.equal(nextRenewal(y, '2026-06-02'), '2027-06-01');
  const w = sub({ cycle: 'weekly', interval: 2, anchorDate: '2026-01-05', startDate: '2026-01-05' });
  assert.deepEqual(billingDates(w, '2026-01-01', '2026-02-05'), ['2026-01-05', '2026-01-19', '2026-02-02']);
});

test('price history applies by date', () => {
  const s = sub({
    amount: 15,
    priceHistory: [
      { from: '2025-10-31', amount: 10, currency: 'USD' },
      { from: '2026-01-01', amount: 15, currency: 'USD' },
    ],
  });
  assert.equal(priceAt(s, '2025-12-31').amount, 10);
  assert.equal(priceAt(s, '2026-01-31').amount, 15);
  // Oct, Nov, Dec at 10; Jan, Feb at 15
  assert.equal(lifetimeSpend(s, 'USD', rates, '2026-02-28'), 60);
});

test('monthly cost normalises cycles and converts currency', () => {
  assert.equal(monthlyCost(sub({ cycle: 'yearly', amount: 120 }), 'USD', rates), 10);
  const gbp = monthlyCost(sub({ currency: 'GBP' }), 'USD', rates);
  assert.ok(Math.abs(gbp - convert(10, 'GBP', 'USD', rates)) < 1e-9);
});

test('monthly series buckets real charges', () => {
  const y = sub({ cycle: 'yearly', amount: 120, anchorDate: '2026-03-10', startDate: '2025-03-10', priceHistory: [{ from: '2025-03-10', amount: 120, currency: 'USD' }] });
  const series = monthlySeries([y], 'USD', rates, 11, 2, '2026-04-15');
  assert.equal(series.length, 14);
  assert.equal(series.find((p) => p.key === '2026-03')?.total, 120);
  assert.equal(series.reduce((a, p) => a + p.total, 0), 120);
  assert.equal(series.at(-1)?.projected, true);
});

test('sharing scales my cost', () => {
  assert.equal(myShareFactor(sub({ sharedWith: ['A', 'B', 'C'], shareMode: 'split' })), 0.25);
  assert.equal(myShareFactor(sub({ sharedWith: ['A'], shareMode: 'i_pay' })), 1);
  assert.equal(owedFactor(sub({ sharedWith: ['A'], shareMode: 'i_pay' })), 0.5);
  assert.equal(myShareFactor(sub({ shareMode: 'they_pay' })), 0);
  assert.equal(myShareFactor(sub({ shareMode: 'split' })), 1);
  const mine = asMyShare(sub({ sharedWith: ['A'], shareMode: 'split' }));
  assert.equal(mine.amount, 5);
  assert.equal(lifetimeSpend(mine, 'USD', rates, '2025-11-30'), 10);
});
