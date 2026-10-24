import { asMyShare, isActive, isPast, monthlyCost, nextRenewal, totalMonthly } from '../lib/calc';
import { convert, formatMoney } from '../lib/currency';
import { daysBetween, today } from '../lib/dates';
import type { Rates, Settings, Subscription } from '../lib/types';

export interface WidgetData {
  total: string;
  count: number;
  next: { name: string; when: string; amount: string }[];
}

/** What the home-screen widget shows, from the persisted store state. */
export function widgetData(state: { subscriptions: Subscription[]; settings: Settings; rates: Rates }): WidgetData {
  const t = today();
  const base = state.settings.baseCurrency;
  const costOf = state.settings.countMyShareOnly ? asMyShare : (s: Subscription) => s;
  const active = state.subscriptions.filter((s) => isActive(s, t)).map(costOf);
  const next = active
    .map((s) => ({ s, date: isPast(s, t) ? null : nextRenewal(s, t) }))
    .filter((x): x is { s: Subscription; date: string } => x.date != null && monthlyCost(x.s, base, state.rates) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
    .map(({ s, date }) => {
      const d = daysBetween(t, date);
      return {
        name: s.name,
        when: d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d}d`,
        amount: formatMoney(convert(s.amount, s.currency, base, state.rates), base),
      };
    });
  return { total: formatMoney(totalMonthly(active, base, state.rates), base), count: active.length, next };
}
