import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { HBars, MonthBars, type Slice } from '../src/components/charts';
import { PlusLocked, usePlus } from '../src/components/PlusGate';
import { Avatar, Button, Card, Section, Segmented, T, shareText, styles } from '../src/components/ui';
import { useOverview } from '../src/hooks';
import { charges, monthlySeries } from '../src/lib/calc';
import { formatMoney } from '../src/lib/currency';
import { monthLabel, today } from '../src/lib/dates';
import { logoOf } from '../src/lib/logo';
import { categoryOf } from '../src/store';
import { space, useTheme } from '../src/theme';

/** Year in review (SubTrack Plus): what you spent, where it went, and what you cut. */
export default function YearInReview() {
  const t = useTheme();
  const o = useOverview();
  const plus = usePlus();
  const thisYear = Number(today().slice(0, 4));
  const [year, setYear] = useState(thisYear);

  const data = useMemo(() => {
    const t0 = today();
    const isCurrent = year === thisYear;
    const end = isCurrent ? t0 : `${year}-12-31`;
    const paid = charges(o.allCosts, `${year}-01-01`, end, o.base, o.rates);
    const total = paid.reduce((s, c) => s + c.amount, 0);
    const prevTotal = charges(o.allCosts, `${year - 1}-01-01`, isCurrent ? `${year - 1}${t0.slice(4)}` : `${year - 1}-12-31`, o.base, o.rates).reduce((s, c) => s + c.amount, 0);

    const bySub = new Map<string, { sub: (typeof paid)[number]['sub']; amount: number }>();
    const byCat = new Map<string, number>();
    for (const c of paid) {
      const e = bySub.get(c.sub.id) ?? { sub: c.sub, amount: 0 };
      e.amount += c.amount;
      bySub.set(c.sub.id, e);
      byCat.set(c.sub.categoryId, (byCat.get(c.sub.categoryId) ?? 0) + c.amount);
    }
    const top = [...bySub.values()].sort((a, b) => b.amount - a.amount).slice(0, 3);
    const cats: Slice[] = [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => {
        const c = categoryOf(o.categories, id);
        return { key: id, label: c.name, value: v, color: c.color };
      });

    const months = isCurrent ? Number(t0.slice(5, 7)) : 12;
    const series = monthlySeries(o.allCosts, o.base, o.rates, months - 1, 0, isCurrent ? t0 : `${year}-12-15`);
    const busiest = [...series].sort((a, b) => b.total - a.total)[0];

    const started = o.subscriptions.filter((s) => s.startDate.startsWith(String(year))).length;
    const cancelled = o.past.filter((v) => v.sub.endDate?.startsWith(String(year)));
    const saving = cancelled.reduce((s, v) => s + v.monthly * 12, 0);
    return { total, prevTotal, top, cats, series, busiest, started, cancelled, saving, isCurrent, perMonth: total / Math.max(1, months) };
  }, [o, year, thisYear]);

  const change = data.prevTotal > 0 ? (data.total - data.prevTotal) / data.prevTotal : null;

  const share = () =>
    shareText(
      [
        `My ${year} in subscriptions (SubTrack)`,
        `💸 ${formatMoney(data.total, o.base)} spent${data.isCurrent ? ' so far' : ''} (${formatMoney(data.perMonth, o.base)}/month)`,
        data.top[0] ? `🏆 Biggest: ${data.top[0].sub.name}, ${formatMoney(data.top[0].amount, o.base)}` : '',
        data.cats[0] ? `📊 Top category: ${data.cats[0].label}` : '',
        data.cancelled.length ? `✂️ Cancelled ${data.cancelled.length}, saving ${formatMoney(data.saving, o.base, { compact: true })}/yr` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: 'Year in review' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: space.md, paddingBottom: 64 }]}>
        <Segmented<string>
          value={String(year)}
          onChange={(v) => setYear(Number(v))}
          options={[thisYear - 1, thisYear].map((y) => ({ value: String(y), label: String(y) }))}
        />

        <Card style={{ marginTop: space.lg }}>
          <T v="label" muted>
            {data.isCurrent ? `Spent in ${year} so far` : `Spent in ${year}`}
          </T>
          <T v="hero" style={{ marginTop: 4 }}>
            {formatMoney(data.total, o.base)}
          </T>
          <T muted>
            {formatMoney(data.perMonth, o.base)} a month on average
            {change != null ? ` · ${change >= 0 ? '+' : ''}${Math.round(change * 100)}% vs ${year - 1}` : ''}
          </T>
        </Card>

        {!plus ? (
          <View style={{ marginTop: space.lg }}>
            <PlusLocked
              title="See your full year"
              body="Year in review breaks down where your money went: month by month, by category, your biggest subscriptions and what you cut. Share it in one tap."
            />
          </View>
        ) : (
          <>
            <Section title="Month by month">
              <Card>
                <MonthBars points={data.series} categories={o.categories} currency={o.base} height={130} />
                {data.busiest && data.busiest.total > 0 ? (
                  <T v="small" faint style={{ marginTop: space.md }}>
                    Busiest month: {monthLabel(data.busiest.key, true)} ({formatMoney(data.busiest.total, o.base)})
                  </T>
                ) : null}
              </Card>
            </Section>

            <Section title="By category">
              <Card>
                <HBars data={data.cats} currency={o.base} />
              </Card>
            </Section>

            <Section title="Biggest subscriptions">
              <Card style={{ paddingVertical: space.xs }}>
                {data.top.map((e, i) => (
                  <View key={e.sub.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
                    <T v="h2" muted style={{ width: 20 }}>
                      {i + 1}
                    </T>
                    <Avatar name={e.sub.name} color={e.sub.color ?? categoryOf(o.categories, e.sub.categoryId).color} size={32} logo={logoOf(e.sub)} />
                    <T style={{ flex: 1 }} numberOfLines={1}>
                      {e.sub.name}
                    </T>
                    <T v="bodyStrong">{formatMoney(e.amount, o.base)}</T>
                  </View>
                ))}
              </Card>
            </Section>

            <Section title="Changes">
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Card style={{ flex: 1, padding: space.md }}>
                  <T v="small" muted>
                    Started
                  </T>
                  <T v="h2">{data.started}</T>
                </Card>
                <Card style={{ flex: 1, padding: space.md }}>
                  <T v="small" muted>
                    Cancelled
                  </T>
                  <T v="h2">{data.cancelled.length}</T>
                </Card>
                <Card style={{ flex: 1.4, padding: space.md }}>
                  <T v="small" muted>
                    Saving
                  </T>
                  <T v="h2" color={t.accent}>
                    {formatMoney(data.saving, o.base, { compact: true })}/yr
                  </T>
                </Card>
              </View>
            </Section>

            <Button icon="upload" label="Share my year" onPress={share} style={{ marginTop: space.xl }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
