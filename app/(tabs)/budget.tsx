import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Dot, Input, Progress, Screen, Section, Sheet, T } from '../../src/components/ui';
import { useOverview } from '../../src/hooks';
import { categoryTotals } from '../../src/lib/calc';
import { formatMoney } from '../../src/lib/currency';
import type { Category } from '../../src/lib/types';
import { useStore } from '../../src/store';
import { space, useTheme } from '../../src/theme';

type Editing = { kind: 'overall' } | { kind: 'category'; category: Category } | null;

export default function BudgetScreen() {
  const t = useTheme();
  const o = useOverview();
  const updateSettings = useStore((s) => s.updateSettings);
  const updateCategory = useStore((s) => s.updateCategory);
  const [editing, setEditing] = useState<Editing>(null);

  const budget = o.settings.monthlyBudget;
  const totals = categoryTotals(o.activeSubs, o.categories, o.base, o.rates);
  const spendFor = (id: string) => totals.find((x) => x.category.id === id)?.monthly ?? 0;
  const categoryBudgetSum = o.categories.reduce((s, c) => s + (c.budget ?? 0), 0);
  const sorted = [...o.categories].sort((a, b) => spendFor(b.id) - spendFor(a.id) || (b.budget ?? 0) - (a.budget ?? 0));

  return (
    <Screen title="Budget">
      <Card onPress={() => setEditing({ kind: 'overall' })}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T v="label" muted>
            Monthly budget
          </T>
          <T v="small" color={t.accent}>
            {budget ? 'Edit' : 'Set budget'}
          </T>
        </View>
        {budget ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: 6 }}>
              <T v="hero">{formatMoney(o.monthly, o.base, { compact: o.monthly >= 1000 })}</T>
              <T muted>of {formatMoney(budget, o.base)}</T>
            </View>
            <View style={{ marginTop: space.md }}>
              <Progress value={o.monthly / budget} height={10} />
            </View>
            <T v="small" color={o.monthly > budget ? t.danger : t.textMuted} style={{ marginTop: space.sm }}>
              {o.monthly > budget
                ? `${formatMoney(o.monthly - budget, o.base)} over budget. Check Insights for the biggest costs.`
                : `${formatMoney(budget - o.monthly, o.base)} left · ${Math.round((o.monthly / budget) * 100)}% used`}
            </T>
          </>
        ) : (
          <T muted style={{ marginTop: 6 }}>
            Set a monthly limit for all subscriptions. You're currently spending {formatMoney(o.monthly, o.base)} a month.
          </T>
        )}
      </Card>

      <Section title="By category">
        <Card style={{ paddingVertical: space.xs }}>
          {sorted.map((c, i) => {
            const spent = spendFor(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => setEditing({ kind: 'category', category: c })}
                style={({ pressed }) => ({ paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: t.border, opacity: pressed ? 0.6 : 1, gap: 8 })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Dot color={c.color} />
                  <T style={{ flex: 1 }}>{c.name}</T>
                  <T v="small" muted>
                    {formatMoney(spent, o.base)}
                    {c.budget ? ` / ${formatMoney(c.budget, o.base)}` : ''}
                  </T>
                </View>
                {c.budget ? (
                  <Progress value={spent / c.budget} color={c.color} height={6} />
                ) : (
                  <T v="small" faint>
                    No limit · tap to set
                  </T>
                )}
              </Pressable>
            );
          })}
        </Card>
        {budget && categoryBudgetSum > budget ? (
          <T v="small" color={t.warn} style={{ marginTop: space.sm }}>
            Your category limits add up to {formatMoney(categoryBudgetSum, o.base)}, more than your overall budget.
          </T>
        ) : null}
        <T v="small" faint style={{ marginTop: space.sm }}>
          Budgets use the monthly equivalent, so a yearly plan counts as 1/12 each month. Amounts are in {o.base}.
        </T>
      </Section>

      <BudgetSheet
        key={editing ? (editing.kind === 'overall' ? 'overall' : editing.category.id) : 'none'}
        visible={editing != null}
        title={editing?.kind === 'category' ? `${editing.category.name} budget` : 'Monthly budget'}
        initial={editing?.kind === 'category' ? editing.category.budget : budget}
        currency={o.base}
        onClose={() => setEditing(null)}
        onSave={(value) => {
          if (editing?.kind === 'category') updateCategory(editing.category.id, { budget: value });
          else updateSettings({ monthlyBudget: value });
          setEditing(null);
        }}
      />
    </Screen>
  );
}

function BudgetSheet({
  visible,
  title,
  initial,
  currency,
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  initial: number | null;
  currency: string;
  onClose: () => void;
  onSave: (v: number | null) => void;
}) {
  const [text, setText] = useState(initial ? String(initial) : '');
  const value = Number(text.replace(',', '.'));
  const valid = text.trim() !== '' && Number.isFinite(value) && value > 0;
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <T v="small" muted style={{ marginBottom: 6 }}>
        Amount per month ({currency})
      </T>
      <Input value={text} onChangeText={setText} keyboardType="decimal-pad" placeholder="e.g. 100" autoFocus />
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
        <Button label="Save" disabled={!valid} onPress={() => onSave(value)} style={{ flex: 1 }} />
        {initial ? <Button kind="secondary" label="Remove" onPress={() => onSave(null)} /> : null}
      </View>
    </Sheet>
  );
}
