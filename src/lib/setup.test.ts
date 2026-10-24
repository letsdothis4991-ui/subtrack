/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canNudge } from './nudge';
import { POPULAR, PRESETS } from './presets';
import { parseAmount, pickComplete, subscriptionFromPick, type SetupPick } from './setup';

const netflix = PRESETS.find((p) => p.name === 'Netflix')!;
const pick = (over: Partial<SetupPick> = {}): SetupPick => ({ preset: netflix, amount: '15.49', cycle: 'monthly', next: '2026-11-03', ...over });

test('amounts typed during setup', () => {
  assert.equal(parseAmount('9,99'), 9.99);
  assert.equal(parseAmount(' 12 '), 12);
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount('-1'), null);
});

test('setup picks become subscriptions', () => {
  assert.equal(pickComplete(pick()), true);
  assert.equal(pickComplete(pick({ amount: '' })), false);
  assert.equal(pickComplete(pick({ next: null })), false);
  assert.equal(subscriptionFromPick(pick({ next: null }), 'USD', 3), null);

  const s = subscriptionFromPick(pick(), 'EUR', 3, '2026-10-24')!;
  assert.equal(s.name, 'Netflix');
  assert.equal(s.amount, 15.49);
  assert.equal(s.currency, 'EUR');
  assert.equal(s.anchorDate, '2026-11-03');
  assert.equal(s.startDate, '2026-10-03');
  assert.equal(s.manageUrl, netflix.manageUrl);
  assert.equal(s.reminderDays, 3);

  // A yearly plan renewing soon started about a year ago.
  assert.equal(subscriptionFromPick(pick({ cycle: 'yearly' }), 'USD', 3, '2026-10-24')!.startDate, '2025-11-03');
});

test('popular services all exist as presets', () => {
  for (const name of POPULAR) assert.ok(PRESETS.some((p) => p.name === name), name);
});

test('Plus prompt stays rare', () => {
  const DAY = 86_400_000;
  const t0 = 1_800_000_000_000;
  const fresh = { firstOpen: t0, shown: 0, lastShown: null };
  assert.equal(canNudge(fresh, t0 + DAY), false, 'not in the first days');
  assert.equal(canNudge(fresh, t0 + 3 * DAY), true);
  assert.equal(canNudge({ ...fresh, shown: 1, lastShown: t0 + 3 * DAY }, t0 + 10 * DAY), false, 'not again within a month');
  assert.equal(canNudge({ ...fresh, shown: 1, lastShown: t0 + 3 * DAY }, t0 + 40 * DAY), true);
  assert.equal(canNudge({ ...fresh, shown: 3, lastShown: t0 }, t0 + 400 * DAY), false, 'at most three times');
});
