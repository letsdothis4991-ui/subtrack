import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { PlusLocked, usePlus } from '../src/components/PlusGate';
import { Avatar, Card, Dot, IconButton, T, styles } from '../src/components/ui';
import { useOverview } from '../src/hooks';
import { charges, type Charge } from '../src/lib/calc';
import { formatMoney } from '../src/lib/currency';
import { addMonths, endOfMonth, formatDate, startOfMonth, today } from '../src/lib/dates';
import { logoOf } from '../src/lib/logo';
import { categoryOf } from '../src/store';
import { radius, space, useTheme } from '../src/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Renewal calendar (SubTrack Plus): which days money leaves, month by month. */
export default function CalendarScreen() {
  const t = useTheme();
  const router = useRouter();
  const o = useOverview();
  const plus = usePlus();
  const t0 = today();
  const [month, setMonth] = useState(startOfMonth(t0));
  const [selected, setSelected] = useState<string | null>(t0);

  const byDay = useMemo(() => {
    const map = new Map<string, Charge[]>();
    for (const c of charges(o.allCosts, month, endOfMonth(month), o.base, o.rates)) {
      if (c.amount <= 0) continue;
      map.set(c.date, [...(map.get(c.date) ?? []), c]);
    }
    return map;
  }, [o, month]);

  const total = [...byDay.values()].flat().reduce((s, c) => s + c.amount, 0);
  const count = [...byDay.values()].flat().length;

  const [y, m] = month.split('-').map(Number);
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month.slice(0, 8)}${String(i + 1).padStart(2, '0')}`)];
  const dayCharges = selected ? byDay.get(selected) ?? [] : [];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: 'Calendar' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: space.sm, paddingBottom: 64 }]}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <IconButton icon="chevronLeft" label="Previous month" onPress={() => setMonth(addMonths(month, -1))} />
          <View style={{ alignItems: 'center' }}>
            <T v="h2">
              {MONTHS[m - 1]} {y}
            </T>
            <T v="small" muted>
              {count} renewal{count === 1 ? '' : 's'} · {formatMoney(total, o.base)}
            </T>
          </View>
          <IconButton icon="chevronRight" label="Next month" onPress={() => setMonth(addMonths(month, 1))} />
        </View>

        {!plus ? (
          <View style={{ marginTop: space.lg }}>
            <PlusLocked
              title="Renewal calendar"
              body="See exactly which days money leaves your account, plan around big renewals, and look back at past months. Part of SubTrack Plus."
            />
          </View>
        ) : (
          <>
            <Card style={{ marginTop: space.md, padding: space.sm }}>
              <View style={{ flexDirection: 'row' }}>
                {WEEKDAYS.map((d, i) => (
                  <T key={i} v="small" faint style={{ width: `${100 / 7}%`, textAlign: 'center', marginVertical: 6 }}>
                    {d}
                  </T>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {cells.map((date, i) => {
                  if (!date) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 58 }} />;
                  const list = byDay.get(date) ?? [];
                  const sel = date === selected;
                  const isToday = date === t0;
                  const sum = list.reduce((s, c) => s + c.amount, 0);
                  return (
                    <Pressable
                      key={date}
                      onPress={() => setSelected(date)}
                      accessibilityLabel={`${formatDate(date)}: ${list.length} renewals`}
                      style={{ width: `${100 / 7}%`, height: 58, padding: 2 }}
                    >
                      <View
                        style={{
                          flex: 1,
                          borderRadius: radius.sm,
                          alignItems: 'center',
                          paddingTop: 5,
                          gap: 3,
                          backgroundColor: sel ? t.accentSoft : 'transparent',
                          borderWidth: isToday ? 1 : 0,
                          borderColor: t.accent,
                        }}
                      >
                        <T v="small" color={sel ? t.accent : date < t0 ? t.textFaint : t.text} style={{ fontWeight: sel ? '700' : '400' }}>
                          {Number(date.slice(8))}
                        </T>
                        {list.length ? (
                          <>
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                              {list.slice(0, 3).map((c) => (
                                <Dot key={c.sub.id} size={5} color={c.sub.color ?? categoryOf(o.categories, c.sub.categoryId).color} />
                              ))}
                            </View>
                            <T v="small" faint style={{ fontSize: 9 }} numberOfLines={1}>
                              {formatMoney(sum, o.base, { compact: true })}
                            </T>
                          </>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            <T v="label" muted style={{ marginTop: space.xl, marginBottom: space.sm }}>
              {selected ? formatDate(selected, { year: true }) : 'Pick a day'}
            </T>
            {dayCharges.length === 0 ? (
              <T muted>Nothing renews on this day.</T>
            ) : (
              <Card style={{ paddingVertical: space.xs }}>
                {dayCharges.map((c, i) => (
                  <Pressable
                    key={c.sub.id}
                    onPress={() => router.push(`/subscription/${c.sub.id}`)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}
                  >
                    <Avatar name={c.sub.name} color={c.sub.color ?? categoryOf(o.categories, c.sub.categoryId).color} size={32} logo={logoOf(c.sub)} />
                    <T style={{ flex: 1 }} numberOfLines={1}>
                      {c.sub.name}
                    </T>
                    <T v="bodyStrong">{formatMoney(c.amount, o.base)}</T>
                  </Pressable>
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
