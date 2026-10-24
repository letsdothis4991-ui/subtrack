import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../../src/components/Icon';
import { Avatar, Button, Card, Dot, Empty, IconButton, Input, Progress, Screen, Segmented, T } from '../../src/components/ui';
import { useOverview, type SubView } from '../../src/hooks';
import { cycleText, isShared, lifetimeSpend } from '../../src/lib/calc';
import { convert, formatMoney } from '../../src/lib/currency';
import { formatDate, relativeDays, today } from '../../src/lib/dates';
import { AdBanner } from '../../src/services/ads';
import { categoryOf, useStore } from '../../src/store';
import { logoOf } from '../../src/lib/logo';
import { space, useTheme } from '../../src/theme';

type Tab = 'active' | 'past';
type Sort = 'next' | 'cost' | 'name';

export default function SubscriptionsScreen() {
  const t = useTheme();
  const router = useRouter();
  const o = useOverview();
  const loadSampleData = useStore((s) => s.loadSampleData);
  const [tab, setTab] = useState<Tab>('active');
  const [sort, setSort] = useState<Sort>('next');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const list = (tab === 'active' ? o.active : o.past).filter((v) => v.sub.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (tab === 'active' && sort === 'cost') return [...list].sort((a, b) => b.monthly - a.monthly);
    if (sort === 'name') return [...list].sort((a, b) => a.sub.name.localeCompare(b.sub.name));
    return list;
  }, [tab, sort, q, o.active, o.past]);

  const dueSoon = o.active.filter((v) => v.daysToNext != null && v.daysToNext <= 7);
  const dueSoonTotal = dueSoon.reduce((sum, v) => sum + convert(v.cost.amount, v.cost.currency, o.base, o.rates), 0);
  const budget = o.settings.monthlyBudget;
  const add = () => router.push('/edit');
  const month = today().slice(0, 7);
  const checkInDue = o.active.length > 0 && o.settings.lastCheckIn !== month && o.subscriptions.some((s) => s.createdAt.slice(0, 7) < month);

  return (
    <Screen
      title="Subscriptions"
      right={<IconButton icon="plus" label="Add subscription" onPress={add} />}
      footer={<AdBanner />}
    >
      {o.subscriptions.length === 0 ? (
        <Empty
          title="Track every subscription"
          body="Add what you pay for to see your monthly total, get a reminder before each renewal, and spot what to cancel."
          action={
            <>
              <Button label="Add your first subscription" icon="plus" onPress={add} />
              <Button kind="ghost" label="Explore with sample data" onPress={loadSampleData} />
            </>
          }
        />
      ) : (
        <>
          <Card>
            <T v="label" muted>
              Per month
            </T>
            <T v="hero" style={{ marginTop: 4 }}>
              {formatMoney(o.monthly, o.base)}
            </T>
            <View style={{ flexDirection: 'row', gap: space.lg, marginTop: 4 }}>
              <T muted>{formatMoney(o.yearly, o.base, { compact: true })} a year</T>
              <T muted>· {o.active.length} active</T>
            </View>
            {budget ? (
              <View style={{ marginTop: space.md, gap: 6 }}>
                <Progress value={o.monthly / budget} />
                <T v="small" muted>
                  {o.monthly <= budget
                    ? `${formatMoney(budget - o.monthly, o.base)} left of ${formatMoney(budget, o.base)} budget`
                    : `${formatMoney(o.monthly - budget, o.base)} over your ${formatMoney(budget, o.base)} budget`}
                </T>
              </View>
            ) : null}
          </Card>

          {checkInDue && tab === 'active' ? (
            <Pressable
              onPress={() => router.push('/check-in')}
              style={{ marginTop: space.md, padding: space.md, borderRadius: 12, backgroundColor: t.accentSoft, flexDirection: 'row', gap: space.sm, alignItems: 'center' }}
            >
              <Icon name="check" size={18} color={t.accent} />
              <View style={{ flex: 1 }}>
                <T v="small" color={t.accent} style={{ fontWeight: '600' }}>
                  Monthly check-in
                </T>
                <T v="small" color={t.accent}>
                  Still using everything? 30 seconds to spot what to cancel.
                </T>
              </View>
              <Icon name="chevronRight" size={18} color={t.accent} />
            </Pressable>
          ) : null}

          {dueSoon.length > 0 && tab === 'active' ? (
            <View style={{ marginTop: space.md, padding: space.md, borderRadius: 12, backgroundColor: t.warnSoft, flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <Icon name="bell" size={18} color={t.warn} />
              <T v="small" color={t.warn} style={{ flex: 1 }}>
                {dueSoon.length === 1 ? `${dueSoon[0].sub.name} renews ${relativeDays(dueSoon[0].daysToNext!)}` : `${dueSoon.length} renewals in the next 7 days`} ·{' '}
                {formatMoney(dueSoonTotal, o.base)}
              </T>
            </View>
          ) : null}

          <View style={{ marginTop: space.lg, gap: space.sm }}>
            <Segmented<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: 'active', label: `Active · ${o.active.length}` },
                { value: 'past', label: `Past · ${o.past.length}` },
              ]}
            />
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <Input placeholder="Search" value={q} onChangeText={setQ} style={{ flex: 1, minWidth: 0, paddingVertical: 9 }} />
              <SortButton value={sort} onChange={setSort} allowCost={tab === 'active'} />
            </View>
          </View>

          <View style={{ marginTop: space.sm }}>
            {rows.map((v) => (
              <SubRow key={v.sub.id} v={v} past={tab === 'past'} />
            ))}
            {rows.length === 0 ? (
              <T muted style={{ textAlign: 'center', paddingVertical: space.xl }}>
                {tab === 'past' ? 'Cancelled subscriptions will appear here with what you paid for them.' : 'Nothing matches.'}
              </T>
            ) : null}
          </View>
        </>
      )}
    </Screen>
  );
}

function SortButton({ value, onChange, allowCost }: { value: Sort; onChange: (s: Sort) => void; allowCost: boolean }) {
  const t = useTheme();
  const order: Sort[] = allowCost ? ['next', 'cost', 'name'] : ['next', 'name'];
  const label = { next: allowCost ? 'Next' : 'Recent', cost: 'Cost', name: 'A–Z' }[value];
  return (
    <Pressable
      onPress={() => onChange(order[(order.indexOf(value) + 1) % order.length])}
      accessibilityLabel={`Sort by ${label}`}
      style={{ paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}
    >
      <T v="small">↕ {label}</T>
    </Pressable>
  );
}

function SubRow({ v, past }: { v: SubView; past: boolean }) {
  const t = useTheme();
  const router = useRouter();
  const categories = useStore((s) => s.categories);
  const rates = useStore((s) => s.rates);
  const base = useStore((s) => s.settings.baseCurrency);
  const cat = categoryOf(categories, v.sub.categoryId);
  const s = v.sub;

  let subtitle: string;
  if (past) {
    subtitle = `${formatDate(s.startDate, { year: true })} – ${formatDate(s.endDate!, { year: true })} · paid ${formatMoney(lifetimeSpend(v.cost, base, rates), base, { compact: true })}`;
  } else if (s.endDate) {
    subtitle = `Ends ${formatDate(s.endDate)}`;
  } else if (v.next) {
    subtitle = `${s.isTrial ? 'Trial ends' : 'Renews'} ${relativeDays(v.daysToNext!)} · ${formatDate(v.next)}`;
  } else {
    subtitle = '';
  }
  const urgent = !past && v.daysToNext != null && v.daysToNext <= 3;

  return (
    <Pressable
      onPress={() => router.push(`/subscription/${s.id}`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
        opacity: pressed ? 0.6 : past ? 0.75 : 1,
      })}
    >
      <Avatar name={s.name} color={s.color ?? cat.color} logo={logoOf(s)} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T v="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {s.name}
          </T>
          {isShared(s) ? <Icon name="users" size={14} color={t.textMuted} /> : null}
          {s.isTrial && !past ? (
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: t.accentSoft }}>
              <T v="small" color={t.accent} style={{ fontSize: 11 }}>
                Trial
              </T>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Dot color={cat.color} size={6} />
          <T v="small" color={urgent ? t.warn : t.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>
            {subtitle}
          </T>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <T v="bodyStrong">{formatMoney(s.amount, s.currency)}</T>
        <T v="small" faint>
          {v.cost.amount !== s.amount ? `you ${formatMoney(v.cost.amount, s.currency)}` : cycleText(s)}
        </T>
      </View>
    </Pressable>
  );
}
