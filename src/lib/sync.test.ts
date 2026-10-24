/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeDocs, normaliseSubscription, sameDoc, type SyncDoc } from './sync';
import type { Settings } from './types';

const settings: Settings = {
  baseCurrency: 'USD', monthlyBudget: null, reminderHour: 9, defaultReminderDays: 3, theme: 'system',
  plus: false, lastCheckIn: null, countMyShareOnly: true,
};

const sub = (id: string, name: string, updatedAt: string) =>
  normaliseSubscription({ id, name, amount: 1, currency: 'USD', cycle: 'monthly', anchorDate: '2026-01-01', startDate: '2026-01-01', categoryId: 'other', updatedAt });

const doc = (over: Partial<SyncDoc>): SyncDoc => ({ subscriptions: [], categories: [], settings, settingsUpdatedAt: '2026-01-01', deleted: {}, ...over });

test('newest edit wins per subscription', () => {
  const a = doc({ subscriptions: [sub('1', 'Old', '2026-01-01'), sub('2', 'Only A', '2026-01-01')] });
  const b = doc({ subscriptions: [sub('1', 'New', '2026-02-01'), sub('3', 'Only B', '2026-01-01')] });
  const m = mergeDocs(a, b);
  assert.deepEqual(m.subscriptions.map((s) => s.name).sort(), ['New', 'Only A', 'Only B']);
  assert.ok(sameDoc(m, mergeDocs(b, a)));
});

test('deletes propagate unless edited afterwards', () => {
  const a = doc({ deleted: { '1': '2026-03-01', '2': '2026-03-01' } });
  const b = doc({ subscriptions: [sub('1', 'Stale', '2026-02-01'), sub('2', 'Edited later', '2026-04-01')] });
  const m = mergeDocs(a, b);
  assert.deepEqual(m.subscriptions.map((s) => s.name), ['Edited later']);
  assert.equal(m.deleted['1'], '2026-03-01');
});

test('settings: newest wins, Plus is never lost', () => {
  const a = doc({ settings: { ...settings, baseCurrency: 'GBP', plus: true }, settingsUpdatedAt: '2026-01-01' });
  const b = doc({ settings: { ...settings, baseCurrency: 'EUR' }, settingsUpdatedAt: '2026-05-01' });
  const m = mergeDocs(a, b);
  assert.equal(m.settings.baseCurrency, 'EUR');
  assert.equal(m.settings.plus, true);
});

test('normalise fills new fields on old data', () => {
  const s = normaliseSubscription({ id: 'x', name: 'Legacy' } as never);
  assert.deepEqual(s.usage, {});
  assert.deepEqual(s.settlements, {});
  assert.equal(s.annualPrice, null);
});
