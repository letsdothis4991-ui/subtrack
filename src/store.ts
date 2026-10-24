import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BackupFile } from './lib/backup';
import { FALLBACK_RATES, fetchRates } from './lib/currency';
import { addMonths, today } from './lib/dates';
import { DEFAULT_CATEGORIES } from './lib/presets';
import { normaliseSubscription, type SyncDoc } from './lib/sync';
import type { Category, Rates, Settings, Subscription, Usage } from './lib/types';

export type SubscriptionInput = Omit<Subscription, 'id' | 'priceHistory' | 'createdAt' | 'updatedAt' | 'usage' | 'settlements'>;

interface State {
  subscriptions: Subscription[];
  categories: Category[];
  settings: Settings;
  rates: Rates;
  settingsUpdatedAt: string;
  deleted: Record<string, string>;
  hydrated: boolean;

  addSubscription: (input: SubscriptionInput) => string;
  updateSubscription: (id: string, input: SubscriptionInput) => void;
  deleteSubscription: (id: string) => void;
  /** Puts back a subscription removed by deleteSubscription (for Undo). */
  undoDelete: (sub: Subscription) => void;
  cancelSubscription: (id: string, endDate: string) => void;
  restoreSubscription: (id: string) => void;

  addCategory: (c: Omit<Category, 'id'>) => string;
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  refreshRates: () => Promise<void>;
  importBackup: (b: BackupFile, mode: 'replace' | 'merge') => void;
  loadSampleData: () => void;

  setUsage: (id: string, month: string, usage: Usage | null) => void;
  completeCheckIn: (month: string) => void;
  toggleSettlement: (id: string, renewal: string, person: string) => void;

  /** Sync: snapshot of everything that syncs, and applying a merged copy. */
  syncDoc: () => SyncDoc;
  applySyncDoc: (doc: SyncDoc) => void;
  eraseAll: () => void;
}

export const DEFAULT_SETTINGS: Settings = {
  baseCurrency: guessCurrency(),
  monthlyBudget: null,
  reminderHour: 9,
  defaultReminderDays: 3,
  theme: 'system',
  plus: false,
  lastCheckIn: null,
  countMyShareOnly: true,
  accent: 'forest',
  widgetStyle: 'light',
};

function guessCurrency(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    const region = locale.split('-').pop()?.toUpperCase();
    const map: Record<string, string> = {
      US: 'USD', GB: 'GBP', AU: 'AUD', CA: 'CAD', NZ: 'NZD', JP: 'JPY', CH: 'CHF', SE: 'SEK', NO: 'NOK',
      DK: 'DKK', PL: 'PLN', IN: 'INR', SG: 'SGD', HK: 'HKD', ZA: 'ZAR', BR: 'BRL', MX: 'MXN', KR: 'KRW',
    };
    const euro = ['DE', 'FR', 'ES', 'IT', 'NL', 'IE', 'PT', 'BE', 'AT', 'FI', 'GR'];
    if (region && map[region]) return map[region];
    if (region && euro.includes(region)) return 'EUR';
  } catch {}
  return 'USD';
}

const now = () => new Date().toISOString();

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      categories: DEFAULT_CATEGORIES,
      settings: DEFAULT_SETTINGS,
      rates: FALLBACK_RATES,
      settingsUpdatedAt: '1970-01-01T00:00:00.000Z',
      deleted: {},
      hydrated: false,

      addSubscription: (input) => {
        const id = uid();
        const sub: Subscription = {
          ...input,
          id,
          usage: {},
          settlements: {},
          createdAt: now(),
          updatedAt: now(),
          priceHistory: [{ from: input.startDate, amount: input.amount, currency: input.currency }],
        };
        set((s) => ({ subscriptions: [...s.subscriptions, sub] }));
        return id;
      },

      updateSubscription: (id, input) =>
        set((s) => ({
          subscriptions: s.subscriptions.map((old) => {
            if (old.id !== id) return old;
            let priceHistory = old.priceHistory;
            if (old.amount !== input.amount || old.currency !== input.currency) {
              // A price change starts today; earlier charges keep their old price.
              const from = today() > input.startDate ? today() : input.startDate;
              priceHistory = [...priceHistory.filter((p) => p.from < from), { from, amount: input.amount, currency: input.currency }];
            }
            if (input.startDate !== old.startDate && priceHistory.length > 0) {
              const [first, ...rest] = priceHistory;
              priceHistory = [{ ...first, from: input.startDate }, ...rest.filter((p) => p.from > input.startDate)];
            }
            return { ...old, ...input, priceHistory, updatedAt: now() };
          }),
        })),

      deleteSubscription: (id) =>
        set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id), deleted: { ...s.deleted, [id]: now() } })),

      undoDelete: (sub) =>
        set((s) => {
          const deleted = { ...s.deleted };
          delete deleted[sub.id];
          // Re-stamp so the restored copy beats the tombstone if it already synced.
          return { subscriptions: [...s.subscriptions.filter((x) => x.id !== sub.id), { ...sub, updatedAt: now() }], deleted };
        }),

      cancelSubscription: (id, endDate) => set((s) => ({ subscriptions: patchSub(s.subscriptions, id, () => ({ endDate })) })),

      restoreSubscription: (id) => set((s) => ({ subscriptions: patchSub(s.subscriptions, id, () => ({ endDate: null })) })),

      addCategory: (c) => {
        const id = uid();
        set((s) => ({ categories: [...s.categories, { ...c, id, updatedAt: now() }] }));
        return id;
      },

      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c)) })),

      deleteCategory: (id) =>
        set((s) => {
          const categories = s.categories.filter((c) => c.id !== id);
          if (!categories.some((c) => c.id === 'other')) categories.push({ ...DEFAULT_CATEGORIES.at(-1)!, updatedAt: now() });
          return {
            categories,
            deleted: { ...s.deleted, [id]: now() },
            subscriptions: s.subscriptions.map((x) => (x.categoryId === id ? { ...x, categoryId: 'other', updatedAt: now() } : x)),
          };
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch }, settingsUpdatedAt: now() })),

      setUsage: (id, month, usage) =>
        set((s) => ({
          subscriptions: patchSub(s.subscriptions, id, (x) => {
            const next = { ...x.usage };
            if (usage) next[month] = usage;
            else delete next[month];
            return { usage: next };
          }),
        })),

      completeCheckIn: (month) => get().updateSettings({ lastCheckIn: month }),

      toggleSettlement: (id, renewal, person) =>
        set((s) => ({
          subscriptions: patchSub(s.subscriptions, id, (x) => {
            const paid = x.settlements[renewal] ?? [];
            const next = paid.includes(person) ? paid.filter((p) => p !== person) : [...paid, person];
            return { settlements: { ...x.settlements, [renewal]: next } };
          }),
        })),

      syncDoc: () => {
        const { subscriptions, categories, settings, settingsUpdatedAt, deleted } = get();
        return { subscriptions, categories, settings, settingsUpdatedAt, deleted };
      },

      applySyncDoc: (doc) =>
        set({
          subscriptions: doc.subscriptions.map(normaliseSubscription),
          categories: doc.categories,
          settings: { ...DEFAULT_SETTINGS, ...doc.settings },
          settingsUpdatedAt: doc.settingsUpdatedAt,
          deleted: doc.deleted,
        }),

      eraseAll: () =>
        set((s) => {
          const t = now();
          const deleted = { ...s.deleted };
          for (const x of [...s.subscriptions, ...s.categories]) deleted[x.id] = t;
          return {
            subscriptions: [],
            categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, updatedAt: t })),
            settings: { ...DEFAULT_SETTINGS, plus: s.settings.plus },
            settingsUpdatedAt: t,
            deleted,
          };
        }),

      refreshRates: async () => {
        try {
          set({ rates: await fetchRates() });
        } catch {
          // Offline: keep the last known rates.
        }
      },

      importBackup: (b, mode) =>
        set((s) => {
          const t = now();
          // Re-stamp so imported data wins over older synced copies.
          const subs = b.subscriptions.map((x) => ({ ...normaliseSubscription(x), updatedAt: t }));
          const cats = b.categories.map((c) => ({ ...c, updatedAt: t }));
          b = { ...b, subscriptions: subs, categories: cats };
          const settings = { ...s.settings, ...b.settings, plus: s.settings.plus };
          if (mode === 'replace') {
            const deleted = { ...s.deleted };
            for (const x of s.subscriptions) if (!subs.some((y) => y.id === x.id)) deleted[x.id] = t;
            return { subscriptions: subs, categories: cats, settings, settingsUpdatedAt: t, deleted };
          }
          const subIds = new Set(s.subscriptions.map((x) => x.id));
          const catIds = new Set(s.categories.map((x) => x.id));
          return {
            subscriptions: [...s.subscriptions, ...b.subscriptions.filter((x) => !subIds.has(x.id))],
            categories: [...s.categories, ...b.categories.filter((x) => !catIds.has(x.id))],
          };
        }),

      loadSampleData: () => {
        const t = today();
        const cur = get().settings.baseCurrency;
        const mk = (
          name: string, amount: number, categoryId: string, monthsAgo: number, opts: Partial<SubscriptionInput> = {},
        ): SubscriptionInput => ({
          name, amount, currency: cur, cycle: 'monthly', interval: 1,
          anchorDate: addMonths(t, -monthsAgo).replace(/-\d\d$/, `-${String(3 + (name.length * 7) % 25).padStart(2, '0')}`),
          startDate: addMonths(t, -monthsAgo), endDate: null, categoryId, notes: '', manageUrl: '',
          reminderDays: 3, isTrial: false, color: null, sharedWith: [], shareMode: 'split', annualPrice: null, logo: null, ...opts,
        });
        const add = get().addSubscription;
        add(mk('Netflix', 15.49, 'streaming', 30, { logo: 'netflix', notes: 'Family plan — mostly for Stranger Things', sharedWith: ['Sam', 'Alex'], shareMode: 'i_pay', manageUrl: 'https://www.netflix.com/account' }));
        add(mk('Spotify', 16.99, 'music', 40, { logo: 'spotify', annualPrice: 169.99, sharedWith: ['Jordan'], shareMode: 'split', manageUrl: 'https://www.spotify.com/account/overview/' }));
        add(mk('ChatGPT Plus', 20, 'ai', 9, { notes: 'Work research and drafting', manageUrl: 'https://chatgpt.com/#settings/Subscription' }));
        add(mk('The Economist', 189, 'news', 20, { cycle: 'yearly', manageUrl: 'https://myaccount.economist.com/' }));
        add(mk('iCloud+', 2.99, 'cloud', 36, { logo: 'icloud' }));
        add(mk('YouTube Premium', 22.99, 'streaming', 12, { logo: 'youtube', shareMode: 'they_pay', notes: "On Mum's family plan" }));
        add(mk('Gym membership', 45, 'fitness', 14, { notes: 'Re-evaluate in January' }));
        add(mk('Xbox Game Pass', 16.99, 'gaming', 5, { annualPrice: 179.99 }));
        add(mk('Microsoft 365', 99.99, 'software', 26, { cycle: 'yearly' }));
        add(mk('Disney+', 13.99, 'streaming', 22, { endDate: addMonths(t, -4), notes: 'Got it to watch The Mandalorian' }));
        add(mk('Headspace', 12.99, 'fitness', 15, { endDate: addMonths(t, -8) }));
        // A price rise, last month's check-in and a settle-up, so every screen has something to show.
        const month = addMonths(t, -1).slice(0, 7);
        set((s) => ({
          subscriptions: s.subscriptions.map((x) => {
            const extra: Partial<Subscription> = {};
            if (x.name === 'Netflix') {
              extra.priceHistory = [{ from: x.startDate, amount: 13.49, currency: cur }, { from: addMonths(t, -3), amount: 15.49, currency: cur }];
            }
            if (x.name === 'Gym membership') extra.usage = { [month]: 'never' };
            if (x.name === 'Xbox Game Pass') extra.usage = { [month]: 'sometimes' };
            if (x.name === 'Spotify' || x.name === 'ChatGPT Plus') extra.usage = { [month]: 'often' };
            return { ...x, createdAt: `${x.startDate}T12:00:00.000Z`, ...extra };
          }),
        }));
      },
    }),
    {
      name: 'subtrack-v1',
      version: 3,
      migrate: (persisted) => {
        const s = persisted as Partial<State> & { settings?: Settings & { adsRemoved?: boolean } };
        if (s.subscriptions) s.subscriptions = s.subscriptions.map(normaliseSubscription);
        if (s.settings && s.settings.adsRemoved) s.settings.plus = true;
        s.deleted ??= {};
        return s as State;
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<State>;
        return { ...current, ...p, settings: { ...current.settings, ...p?.settings } };
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ subscriptions, categories, settings, rates, settingsUpdatedAt, deleted }) => ({ subscriptions, categories, settings, rates, settingsUpdatedAt, deleted }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    },
  ),
);

export const categoryOf = (categories: Category[], id: string) =>
  categories.find((c) => c.id === id) ?? { id: 'other', name: 'Other', color: '#8C8C86', budget: null };

function patchSub(list: Subscription[], id: string, fn: (s: Subscription) => Partial<Subscription>): Subscription[] {
  return list.map((x) => (x.id === id ? { ...x, ...fn(x), updatedAt: now() } : x));
}
