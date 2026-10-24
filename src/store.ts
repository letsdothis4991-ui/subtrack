import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BackupFile } from './lib/backup';
import { FALLBACK_RATES, fetchRates } from './lib/currency';
import { addMonths, today } from './lib/dates';
import { DEFAULT_CATEGORIES } from './lib/presets';
import type { Category, Rates, Settings, Subscription } from './lib/types';

export type SubscriptionInput = Omit<Subscription, 'id' | 'priceHistory' | 'createdAt'>;

interface State {
  subscriptions: Subscription[];
  categories: Category[];
  settings: Settings;
  rates: Rates;
  hydrated: boolean;

  addSubscription: (input: SubscriptionInput) => string;
  updateSubscription: (id: string, input: SubscriptionInput) => void;
  deleteSubscription: (id: string) => void;
  cancelSubscription: (id: string, endDate: string) => void;
  restoreSubscription: (id: string) => void;

  addCategory: (c: Omit<Category, 'id'>) => string;
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  refreshRates: () => Promise<void>;
  importBackup: (b: BackupFile, mode: 'replace' | 'merge') => void;
  loadSampleData: () => void;
}

export const DEFAULT_SETTINGS: Settings = {
  baseCurrency: guessCurrency(),
  monthlyBudget: null,
  reminderHour: 9,
  defaultReminderDays: 3,
  theme: 'system',
  adsRemoved: false,
  countMyShareOnly: true,
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

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      categories: DEFAULT_CATEGORIES,
      settings: DEFAULT_SETTINGS,
      rates: FALLBACK_RATES,
      hydrated: false,

      addSubscription: (input) => {
        const id = uid();
        const sub: Subscription = {
          ...input,
          id,
          createdAt: new Date().toISOString(),
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
            return { ...old, ...input, priceHistory };
          }),
        })),

      deleteSubscription: (id) => set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id) })),

      cancelSubscription: (id, endDate) =>
        set((s) => ({ subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, endDate } : x)) })),

      restoreSubscription: (id) =>
        set((s) => ({ subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, endDate: null } : x)) })),

      addCategory: (c) => {
        const id = uid();
        set((s) => ({ categories: [...s.categories, { ...c, id }] }));
        return id;
      },

      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      deleteCategory: (id) =>
        set((s) => {
          const categories = s.categories.filter((c) => c.id !== id);
          if (!categories.some((c) => c.id === 'other')) categories.push(DEFAULT_CATEGORIES.at(-1)!);
          return {
            categories,
            subscriptions: s.subscriptions.map((x) => (x.categoryId === id ? { ...x, categoryId: 'other' } : x)),
          };
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      refreshRates: async () => {
        try {
          set({ rates: await fetchRates() });
        } catch {
          // Offline: keep the last known rates.
        }
      },

      importBackup: (b, mode) =>
        set((s) => {
          b = { ...b, subscriptions: b.subscriptions.map((x) => ({ ...x, sharedWith: x.sharedWith ?? [], shareMode: x.shareMode ?? 'split' })) };
          const settings = { ...s.settings, ...b.settings, adsRemoved: s.settings.adsRemoved };
          if (mode === 'replace') return { subscriptions: b.subscriptions, categories: b.categories, settings };
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
          startDate: addMonths(t, -monthsAgo), endDate: null, categoryId, notes: '', manageUrl: '', paymentMethod: '',
          reminderDays: 3, isTrial: false, color: null, sharedWith: [], shareMode: 'split', ...opts,
        });
        const add = get().addSubscription;
        add(mk('Netflix', 15.49, 'streaming', 30, { notes: 'Family plan — mostly for Stranger Things', sharedWith: ['Sam', 'Alex'], shareMode: 'i_pay', manageUrl: 'https://www.netflix.com/account' }));
        add(mk('Spotify', 16.99, 'music', 40, { sharedWith: ['Jordan'], shareMode: 'split', manageUrl: 'https://www.spotify.com/account/overview/', paymentMethod: 'Visa •• 4021' }));
        add(mk('ChatGPT Plus', 20, 'ai', 9, { notes: 'Work research and drafting', manageUrl: 'https://chatgpt.com/#settings/Subscription' }));
        add(mk('The Economist', 189, 'news', 20, { cycle: 'yearly', manageUrl: 'https://myaccount.economist.com/' }));
        add(mk('iCloud+', 2.99, 'cloud', 36, {}));
        add(mk('YouTube Premium', 22.99, 'streaming', 12, { shareMode: 'they_pay', notes: "On Mum's family plan" }));
        add(mk('Gym membership', 45, 'fitness', 14, { notes: 'Re-evaluate in January' }));
        add(mk('Xbox Game Pass', 16.99, 'gaming', 5, { isTrial: false }));
        add(mk('Microsoft 365', 99.99, 'software', 26, { cycle: 'yearly' }));
        add(mk('Disney+', 13.99, 'streaming', 22, { endDate: addMonths(t, -4), notes: 'Got it to watch The Mandalorian' }));
        add(mk('Headspace', 12.99, 'fitness', 15, { endDate: addMonths(t, -8) }));
      },
    }),
    {
      name: 'subtrack-v1',
      version: 2,
      migrate: (persisted, version) => {
        const s = persisted as Partial<State>;
        if (version < 2 && s.subscriptions) {
          s.subscriptions = s.subscriptions.map((x) => ({ ...x, sharedWith: x.sharedWith ?? [], shareMode: x.shareMode ?? 'split' }));
        }
        return s as State;
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<State>;
        return { ...current, ...p, settings: { ...current.settings, ...p?.settings } };
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ subscriptions, categories, settings, rates }) => ({ subscriptions, categories, settings, rates }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    },
  ),
);

export const categoryOf = (categories: Category[], id: string) =>
  categories.find((c) => c.id === id) ?? { id: 'other', name: 'Other', color: '#8C8C86', budget: null };
