/**
 * How a shared subscription is paid:
 * - split: cost divided equally between me and the people listed
 * - i_pay: I pay the full price; the others owe me their share
 * - they_pay: someone else pays; I'm a member (e.g. on a family plan)
 */
export type ShareMode = 'split' | 'i_pay' | 'they_pay';

/** Monthly check-in answer: how much did I use it? */
export type Usage = 'often' | 'sometimes' | 'never';

export type Cycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** An ISO calendar date, `YYYY-MM-DD`, in the user's local calendar. */
export type ISODate = string;

export interface PricePoint {
  /** First date this price applied. */
  from: ISODate;
  amount: number;
  currency: string;
}

export interface Subscription {
  id: string;
  name: string;
  /** Current price per billing period, in `currency`. */
  amount: number;
  currency: string;
  cycle: Cycle;
  /** Bill every N cycles (e.g. every 2 months). */
  interval: number;
  /**
   * A known billing date. All other billing dates are this date plus or minus
   * whole billing periods, so the next renewal never drifts.
   */
  anchorDate: ISODate;
  startDate: ISODate;
  /** Set when the subscription was cancelled; it then shows under "Past". */
  endDate: ISODate | null;
  categoryId: string;
  /** "Why I have it". */
  notes: string;
  manageUrl: string;
  /** Days before renewal to remind; null = no reminder. */
  reminderDays: number | null;
  isTrial: boolean;
  color: string | null;
  /** Names of the people the subscription is shared with (not including me). */
  sharedWith: string[];
  shareMode: ShareMode;
  /** For i_pay: renewal date → names of people who have paid me for that renewal. */
  settlements: Record<ISODate, string[]>;
  /** Monthly check-ins, keyed by `YYYY-MM`. */
  usage: Record<string, Usage>;
  /** Price of the annual plan, if the service offers one (for savings tips). Same currency. */
  annualPrice: number | null;
  /** simple-icons slug for the service logo. */
  logo: string | null;
  priceHistory: PricePoint[];
  createdAt: string;
  /** Last local edit; newest wins when syncing. */
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  /** Monthly budget in base currency; null = none. */
  budget: number | null;
  updatedAt?: string;
}

export type ThemePref = 'system' | 'light' | 'dark';

export interface Settings {
  baseCurrency: string;
  /** Overall monthly budget in base currency; null = none. */
  monthlyBudget: number | null;
  /** Local hour (0-23) at which reminders fire. */
  reminderHour: number;
  defaultReminderDays: number | null;
  theme: ThemePref;
  /** SubTrack Plus unlocked (no ads). */
  plus: boolean;
  /** Month (`YYYY-MM`) of the last completed check-in. */
  lastCheckIn: string | null;
  /** Totals, charts and budgets count only my share of shared subscriptions. */
  countMyShareOnly: boolean;
  /** Accent colour theme id (Plus, except the default). */
  accent: string;
  /** Home-screen widget look: light is free, dark and accent are Plus. */
  widgetStyle: 'light' | 'dark' | 'accent';
  /** First-run setup finished or skipped. */
  setupDone: boolean;
}

export interface Rates {
  /** Units of each currency per 1 EUR. */
  rates: Record<string, number>;
  updatedAt: string | null;
}
