import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { formatMoney } from '../lib/currency';
import { monthLabel } from '../lib/dates';
import type { MonthPoint } from '../lib/calc';
import type { Category } from '../lib/types';
import { space, useTheme } from '../theme';
import { Dot, T } from './ui';

export interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Donut with a centred total. Gaps between slices keep it crisp at small sizes. */
export function Donut({ data, size = 180, thickness = 22, center, sub }: { data: Slice[]; size?: number; thickness?: number; center: string; sub?: string }) {
  const t = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gap = data.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.track} strokeWidth={thickness} fill="none" />
          {total > 0 &&
            data.map((d) => {
              const len = (d.value / total) * c;
              const seg = (
                <Circle
                  key={d.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={d.color}
                  strokeWidth={thickness}
                  fill="none"
                  strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return seg;
            })}
        </G>
      </Svg>
      <T v="h2">{center}</T>
      {sub ? (
        <T v="small" muted>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

export function Legend({ data, currency, total }: { data: Slice[]; currency: string; total: number }) {
  return (
    <View style={{ gap: 10, flex: 1, minWidth: 180 }}>
      {data.map((d) => (
        <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Dot color={d.color} />
          <T v="small" style={{ flex: 1 }} numberOfLines={1}>
            {d.label}
          </T>
          <T v="small" muted>
            {total > 0 ? Math.round((d.value / total) * 100) : 0}%
          </T>
          <T v="small" style={{ width: 76, textAlign: 'right' }}>
            {formatMoney(d.value, currency)}
          </T>
        </View>
      ))}
    </View>
  );
}

/**
 * Monthly spend as bars stacked by category. Projected months are faded.
 * Tapping a bar shows its total.
 */
export function MonthBars({ points, categories, currency, height = 160, budget }: { points: MonthPoint[]; categories: Category[]; currency: string; height?: number; budget?: number | null }) {
  const t = useTheme();
  const max = Math.max(1, budget ?? 0, ...points.map((p) => p.total));
  const nowIdx = points.findIndex((p, i) => !p.projected && (points[i + 1]?.projected ?? true));
  const [sel, setSel] = useState(nowIdx >= 0 ? nowIdx : points.length - 1);
  const selected = points[sel];
  const colorOf = (id: string) => categories.find((c) => c.id === id)?.color ?? t.textFaint;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginBottom: space.md }}>
        <T v="h2">{formatMoney(selected?.total ?? 0, currency)}</T>
        <T v="small" muted>
          {selected ? `${monthLabel(selected.key, true)}${selected.projected ? ' · projected' : ''}` : ''}
        </T>
      </View>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        {budget ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: (budget / max) * height, borderTopWidth: 1, borderStyle: 'dashed', borderColor: t.danger, opacity: 0.6 }}
          />
        ) : null}
        {points.map((p, i) => {
          const entries = Object.entries(p.byCategory).sort((a, b) => b[1] - a[1]);
          return (
            <Pressable
              key={p.key}
              onPress={() => setSel(i)}
              accessibilityLabel={`${monthLabel(p.key, true)}: ${formatMoney(p.total, currency)}`}
              style={{ flex: 1, height: '100%', justifyContent: 'flex-end', opacity: p.projected ? 0.4 : 1 }}
            >
              <View
                style={{
                  height: Math.max(2, (p.total / max) * height),
                  borderRadius: 4,
                  overflow: 'hidden',
                  backgroundColor: p.total === 0 ? t.track : undefined,
                  borderWidth: i === sel ? 1.5 : 0,
                  borderColor: t.text,
                }}
              >
                {entries.map(([cat, v]) => (
                  <View key={cat} style={{ flex: v, backgroundColor: colorOf(cat) }} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
        {points.map((p, i) => (
          <T key={p.key} v="small" faint={i !== sel} style={{ flex: 1, textAlign: 'center', fontSize: 10 }}>
            {monthLabel(p.key).charAt(0)}
          </T>
        ))}
      </View>
    </View>
  );
}

/** Horizontal bars, e.g. top subscriptions. */
export function HBars({ data, currency }: { data: Slice[]; currency: string }) {
  const t = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: 12 }}>
      {data.map((d) => (
        <View key={d.key}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <T v="small" numberOfLines={1} style={{ flex: 1 }}>
              {d.label}
            </T>
            <T v="small" muted>
              {formatMoney(d.value, currency)}
            </T>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.track }}>
            <View style={{ width: `${(d.value / max) * 100}%`, height: 6, borderRadius: 3, backgroundColor: d.color }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** A thin proportional strip, used for billing-cycle split. */
export function Strip({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
        {data.filter((d) => d.value > 0).map((d) => (
          <View key={d.key} style={{ flex: d.value, backgroundColor: d.color }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.sm }}>
        {data.filter((d) => d.value > 0).map((d) => (
          <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Dot color={d.color} size={8} />
            <T v="small" muted>
              {d.label} {Math.round((d.value / total) * 100)}%
            </T>
          </View>
        ))}
      </View>
    </View>
  );
}
