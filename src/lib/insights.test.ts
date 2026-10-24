/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { annualSaving, cancelReason, outstanding, recentPriceChanges, settlements } from './insights';
import { normaliseSubscription } from './sync';
import type { Subscription } from './types';

const sub = (over: Partial<Subscription> = {}) =>
  normaliseSubscription({
    id: 's', name: 'Netflix', amount: 15, currency: 'USD', cycle: 'monthly', interval: 1,
    anchorDate: '2026-01-10', startDate: '2025-01-10', categoryId: 'streaming',
    priceHistory: [{ from: '2025-01-10', amount: 15, currency: 'USD' }], ...over,
  });

test('cancel candidates from check-ins', () => {
  assert.equal(cancelReason(sub({ usage: { '2026-09': 'often', '2026-10': 'never' } })), 'unused');
  assert.equal(cancelReason(sub({ usage: { '2026-09': 'sometimes', '2026-10': 'sometimes' } })), 'rarely');
  assert.equal(cancelReason(sub({ usage: { '2026-09': 'often', '2026-10': 'sometimes' } })), null);
  assert.equal(cancelReason(sub()), null);
});

test('price rises in the last year', () => {
  const s = sub({ priceHistory: [{ from: '2024-01-10', amount: 10, currency: 'USD' }, { from: '2026-03-01', amount: 12, currency: 'USD' }] });
  const [c] = recentPriceChanges([s], 12, '2026-10-24');
  assert.equal(c.from, 10);
  assert.equal(c.to, 12);
  assert.ok(Math.abs(c.pct - 0.2) < 1e-9);
  assert.equal(recentPriceChanges([s], 6, '2026-10-24').length, 0);
});

test('annual plan saving', () => {
  assert.equal(annualSaving(sub({ amount: 10, annualPrice: 100 })), 20);
  assert.equal(annualSaving(sub({ amount: 10, annualPrice: 130 })), null);
  assert.equal(annualSaving(sub({ cycle: 'yearly', annualPrice: 100 })), null);
});

test('settle-up per renewal', () => {
  const s = sub({ amount: 15, sharedWith: ['Sam', 'Alex'], shareMode: 'i_pay', settlements: { '2026-10-10': ['Sam'] } });
  const [latest, prev] = settlements(s, 2, '2026-10-24');
  assert.equal(latest.date, '2026-10-10');
  assert.equal(latest.perPerson, 5);
  assert.deepEqual(latest.unpaid, ['Alex']);
  assert.equal(prev.date, '2026-09-10');
  assert.equal(outstanding(s, '2026-10-24') > 0, true);
  assert.deepEqual(settlements(sub({ sharedWith: ['A'], shareMode: 'split' })), []);
});
