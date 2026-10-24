import { useMemo } from 'react';
import { asMyShare, isActive, isPast, monthlyCost, nextRenewal, totalMonthly } from './lib/calc';
import { daysBetween, today } from './lib/dates';
import type { Subscription } from './lib/types';
import { useStore } from './store';

export interface SubView {
  /** As entered (full price). */
  sub: Subscription;
  /** As it costs me: my share when "count my share only" is on, otherwise the full price. */
  cost: Subscription;
  next: string | null;
  daysToNext: number | null;
  /** Monthly cost in base currency, from `cost`. */
  monthly: number;
}

/** Applies the "count only my share" setting. */
export function useCostOf() {
  const shareOnly = useStore((s) => s.settings.countMyShareOnly);
  return shareOnly ? asMyShare : (s: Subscription) => s;
}

/** Shared derived data for list, insights and budget screens. */
export function useOverview() {
  const subscriptions = useStore((s) => s.subscriptions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);
  const rates = useStore((s) => s.rates);
  const base = settings.baseCurrency;

  return useMemo(() => {
    const t = today();
    const costOf = settings.countMyShareOnly ? asMyShare : (s: Subscription) => s;
    const view = (sub: Subscription): SubView => {
      const cost = costOf(sub);
      const next = isPast(sub, t) ? null : nextRenewal(sub, t);
      return { sub, cost, next, daysToNext: next ? daysBetween(t, next) : null, monthly: monthlyCost(cost, base, rates) };
    };
    const active = subscriptions
      .filter((s) => isActive(s, t) || (!isPast(s, t) && s.startDate > t))
      .map(view)
      .sort((a, b) => (a.next ?? '9999').localeCompare(b.next ?? '9999'));
    const past = subscriptions
      .filter((s) => isPast(s, t))
      .map(view)
      .sort((a, b) => (b.sub.endDate ?? '').localeCompare(a.sub.endDate ?? ''));
    // Cost-adjusted lists for totals and charts.
    const activeSubs = active.map((a) => a.cost);
    const allCosts = subscriptions.map(costOf);
    const monthly = totalMonthly(activeSubs, base, rates);
    return { active, past, activeSubs, allCosts, monthly, yearly: monthly * 12, base, rates, categories, settings, subscriptions };
  }, [subscriptions, categories, settings, rates, base]);
}
