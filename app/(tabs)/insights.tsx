import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Donut, HBars, Legend, MonthBars, Strip, type Slice } from '../../src/components/charts';
import { Avatar, Card, Empty, Button, Screen, Section, Segmented, T } from '../../src/components/ui';
import { useOverview } from '../../src/hooks';
import { categoryTotals, charges, isShared, lifetimeSpend, monthlyCost, monthlySeries, myShareFactor, owedFactor } from '../../src/lib/calc';
import { formatMoney } from '../../src/lib/currency';
import { addDays, formatDate, today } from '../../src/lib/dates';
import { AdBanner } from '../../src/services/ads';
import { categoryOf } from '../../src/store';
import { shareSummary } from '../../src/lib/share';
import { space, useTheme } from '../../src/theme';

type Period = 'month' | 'year';

export default function InsightsScreen() {
  const t = useTheme();
  const router = useRouter();
  const o = useOverview();
  const [period, setPeriod] = useState<Period>('month');
  const mult = period === 'month' ? 1 : 12;

  const data = useMemo(() => {
    const t0 = today();
    const cats = categoryTotals(o.activeSubs, o.categories, o.base, o.rates);
    const series = monthlySeries(o.allCosts, o.base, o.rates, 11, 6);
    const upcoming = charges(o.activeSubs, t0, addDays(t0, 30), o.base, o.rates).filter((c) => c.amount > 0);
    const lastYear = monthlySeries(o.allCosts, o.base, o.rates, 11, 0).reduce((s, p) => s + p.total, 0);
    const lifetime = o.allCosts.reduce((s, x) => s + lifetimeSpend(x, o.base, o.rates), 0);
    const saved = o.past.reduce((s, v) => s + v.monthly, 0);
    const byCycle = (['weekly', 'monthly', 'quarterly', 'yearly'] as const).map((c, i) => ({
      key: c,
      label: c[0].toUpperCase() + c.slice(1),
      value: o.active.filter((v) => v.sub.cycle === c).reduce((s, v) => s + v.monthly, 0),
      color: [t.textFaint, t.accent, '#C9A93A', '#4F6D8F'][i],
    }));
    const shared = o.active.filter((v) => isShared(v.sub));
    const fullMonthly = (v: (typeof o.active)[number]) => monthlyCost(v.sub, o.base, o.rates);
    const owed = shared.reduce((s, v) => s + fullMonthly(v) * owedFactor(v.sub), 0);
    const sharingSaves = shared.reduce((s, v) => s + fullMonthly(v) * (1 - myShareFactor(v.sub)), 0);
    return { cats, series, upcoming, lastYear, lifetime, saved, byCycle, shared, owed, sharingSaves, fullMonthly };
  }, [o, t]);

  if (o.subscriptions.length === 0) {
    return (
      <Screen title="Insights">
        <Empty title="No data yet" body="Add a few subscriptions to see where your money goes." action={<Button label="Add subscription" onPress={() => router.push('/edit')} />} />
      </Screen>
    );
  }

  const slices: Slice[] = data.cats.map((c) => ({ key: c.category.id, label: c.category.name, value: c.monthly * mult, color: c.category.color }));
  const top: Slice[] = [...o.active]
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 6)
    .map((v) => ({ key: v.sub.id, label: v.sub.name, value: v.monthly * mult, color: v.sub.color ?? categoryOf(o.categories, v.sub.categoryId).color }));
  const upcomingTotal = data.upcoming.reduce((s, c) => s + c.amount, 0);
  const total = o.monthly * mult;

  return (
    <Screen title="Insights" footer={<AdBanner />}>
      <Segmented<Period>
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'month', label: 'Monthly' },
          { value: 'year', label: 'Yearly' },
        ]}
      />

      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
        <Stat label="Active" value={String(o.active.length)} />
        <Stat label={`Avg / sub`} value={formatMoney(o.active.length ? total / o.active.length : 0, o.base, { compact: true })} />
        <Stat label="Daily" value={formatMoney(o.monthly / 30.44, o.base)} />
      </View>

      <Section title="By category">
        <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xl, alignItems: 'center', justifyContent: 'center' }}>
          <Donut data={slices} center={formatMoney(total, o.base, { compact: true })} sub={period === 'month' ? 'per month' : 'per year'} />
          <Legend data={slices} currency={o.base} total={total} />
        </Card>
      </Section>

      <Section title="Monthly spend">
        <Card>
          <MonthBars points={data.series} categories={o.categories} currency={o.base} budget={o.settings.monthlyBudget} />
          <T v="small" faint style={{ marginTop: space.md }}>
            Actual charges by month. Faded bars are the next 6 months, projected
            {o.settings.monthlyBudget ? '; the dashed line is your budget' : ''}. Tap a bar for details.
          </T>
        </Card>
      </Section>

      <Section title={`Biggest subscriptions · ${period === 'month' ? 'monthly' : 'yearly'}`}>
        <Card>
          <HBars data={top} currency={o.base} />
        </Card>
      </Section>

      <Section title="Next 30 days" right={<T v="small" muted>{formatMoney(upcomingTotal, o.base)}</T>}>
        <Card style={{ paddingVertical: space.sm }}>
          {data.upcoming.length === 0 ? (
            <T muted style={{ paddingVertical: space.md }}>
              Nothing renews in the next 30 days.
            </T>
          ) : (
            data.upcoming.map((c, i) => (
              <View
                key={`${c.sub.id}-${c.date}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}
              >
                <T v="small" muted style={{ width: 52 }}>
                  {formatDate(c.date)}
                </T>
                <Avatar name={c.sub.name} color={c.sub.color ?? categoryOf(o.categories, c.sub.categoryId).color} size={24} />
                <T v="small" style={{ flex: 1 }} numberOfLines={1}>
                  {c.sub.name}
                </T>
                <T v="small">{formatMoney(c.amount, o.base)}</T>
              </View>
            ))
          )}
        </Card>
      </Section>

      {data.shared.length > 0 ? (
        <Section title="Shared">
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Stat label="Sharing saves you" value={`${formatMoney(data.sharingSaves * mult, o.base, { compact: true })}`} />
            <Stat label="Others owe you" value={`${formatMoney(data.owed * mult, o.base, { compact: true })}`} />
          </View>
          <Card style={{ marginTop: space.sm, paddingVertical: space.xs }}>
            {data.shared.map((v, i) => (
              <Pressable
                key={v.sub.id}
                onPress={() => router.push(`/subscription/${v.sub.id}`)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}
              >
                <Avatar name={v.sub.name} color={v.sub.color ?? categoryOf(o.categories, v.sub.categoryId).color} size={28} />
                <View style={{ flex: 1 }}>
                  <T v="small" numberOfLines={1}>
                    {v.sub.name}
                  </T>
                  <T v="small" faint numberOfLines={1}>
                    {shareSummary(v.sub)}
                  </T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T v="small">{formatMoney(data.fullMonthly(v) * myShareFactor(v.sub) * mult, o.base)}</T>
                  <T v="small" faint>
                    of {formatMoney(data.fullMonthly(v) * mult, o.base)}
                  </T>
                </View>
              </Pressable>
            ))}
          </Card>
          <T v="small" faint style={{ marginTop: space.sm }}>
            {o.settings.countMyShareOnly
              ? 'Totals and charts count only your share. Change this in Settings.'
              : 'Totals and charts count full prices. Turn on "Count only my share" in Settings.'}
          </T>
        </Section>
      ) : null}

      <Section title="Billing cycles">
        <Card>
          <Strip data={data.byCycle} />
          <T v="small" faint style={{ marginTop: space.sm }}>
            Share of your monthly cost by how often you're billed. Annual plans are often cheaper, so it's worth checking your big monthly ones.
          </T>
        </Card>
      </Section>

      <Section title="History">
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Stat label="Last 12 months" value={formatMoney(data.lastYear, o.base, { compact: true })} />
          <Stat label="All time" value={formatMoney(data.lifetime, o.base, { compact: true })} />
        </View>
        {data.saved > 0 ? (
          <Card style={{ marginTop: space.sm, backgroundColor: t.accentSoft, borderColor: t.accentSoft }}>
            <T color={t.accent} v="bodyStrong">
              You're saving {formatMoney(data.saved, o.base)}/mo
            </T>
            <T v="small" color={t.accent}>
              from {o.past.length} cancelled subscription{o.past.length === 1 ? '' : 's'} ({formatMoney(data.saved * 12, o.base, { compact: true })} a year).
            </T>
          </Card>
        ) : null}
      </Section>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, padding: space.md }}>
      <T v="small" muted>
        {label}
      </T>
      <T v="h2" style={{ marginTop: 2 }} numberOfLines={1}>
        {value}
      </T>
    </Card>
  );
}
