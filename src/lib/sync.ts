import type { Category, Settings, Subscription } from './types';

/** Everything that syncs between devices. Rates and UI state stay local. */
export interface SyncDoc {
  subscriptions: Subscription[];
  categories: Category[];
  settings: Settings;
  settingsUpdatedAt: string;
  /** Tombstones: id → deletion time, so deletes propagate. */
  deleted: Record<string, string>;
}

const EPOCH = '1970-01-01T00:00:00.000Z';

/** Fills fields added in later versions so old data, backups and synced docs all have the current shape. */
export function normaliseSubscription(x: Partial<Subscription> & Pick<Subscription, 'id'>): Subscription {
  return {
    sharedWith: [],
    shareMode: 'split',
    settlements: {},
    usage: {},
    annualPrice: null,
    logo: null,
    color: null,
    notes: '',
    manageUrl: '',
    reminderDays: null,
    isTrial: false,
    endDate: null,
    interval: 1,
    priceHistory: [],
    createdAt: x.createdAt ?? EPOCH,
    updatedAt: x.updatedAt ?? x.createdAt ?? EPOCH,
    ...x,
  } as Subscription;
}

function mergeById<T extends { id: string; updatedAt?: string }>(a: T[], b: T[], deleted: Record<string, string>): T[] {
  const out = new Map<string, T>();
  for (const item of [...a, ...b]) {
    const prev = out.get(item.id);
    if (!prev || (item.updatedAt ?? EPOCH) > (prev.updatedAt ?? EPOCH)) out.set(item.id, item);
  }
  return [...out.values()].filter((item) => {
    const d = deleted[item.id];
    return !d || (item.updatedAt ?? EPOCH) > d;
  });
}

/** Merges two copies: newest edit wins per item, deletes win over older edits. Order-independent. */
export function mergeDocs(local: SyncDoc, remote: SyncDoc): SyncDoc {
  const deleted: Record<string, string> = { ...remote.deleted };
  for (const [id, at] of Object.entries(local.deleted)) if (!deleted[id] || at > deleted[id]) deleted[id] = at;
  const newerSettings = local.settingsUpdatedAt >= remote.settingsUpdatedAt ? local : remote;
  return {
    subscriptions: mergeById(local.subscriptions, remote.subscriptions.map(normaliseSubscription), deleted),
    categories: mergeById(local.categories, remote.categories, deleted),
    // Purchases are tied to the store account; never lose Plus because another device lacks it.
    settings: { ...newerSettings.settings, plus: local.settings.plus || remote.settings.plus },
    settingsUpdatedAt: newerSettings.settingsUpdatedAt,
    deleted,
  };
}

/** Cheap equality for deciding whether a push is needed. */
export function sameDoc(a: SyncDoc, b: SyncDoc): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function canonical(d: SyncDoc) {
  const byId = <T extends { id: string }>(xs: T[]) => [...xs].sort((p, q) => p.id.localeCompare(q.id));
  return { ...d, subscriptions: byId(d.subscriptions), categories: byId(d.categories), deleted: Object.entries(d.deleted).sort() };
}
