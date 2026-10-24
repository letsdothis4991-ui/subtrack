import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { DateField } from '../../src/components/DatePicker';
import { Icon } from '../../src/components/Icon';
import { Avatar, Button, Card, Dot, Empty, IconButton, Section, Sheet, T, confirm, styles } from '../../src/components/ui';
import { cycleText, isPast, isShared, lifetimeSpend, monthlyCost, myShareFactor, nextRenewal, owedFactor } from '../../src/lib/calc';
import { shareSummary } from '../../src/lib/share';
import { useCostOf } from '../../src/hooks';
import { convert, formatMoney } from '../../src/lib/currency';
import { daysBetween, formatDate, relativeDays, today } from '../../src/lib/dates';
import { categoryOf, useStore } from '../../src/store';
import { space, useTheme } from '../../src/theme';

export default function SubscriptionDetail() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sub = useStore((s) => s.subscriptions.find((x) => x.id === id));
  const categories = useStore((s) => s.categories);
  const rates = useStore((s) => s.rates);
  const base = useStore((s) => s.settings.baseCurrency);
  const cancelSubscription = useStore((s) => s.cancelSubscription);
  const restoreSubscription = useStore((s) => s.restoreSubscription);
  const deleteSubscription = useStore((s) => s.deleteSubscription);
  const [cancelling, setCancelling] = useState(false);
  const costOf = useCostOf();

  if (!sub) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Empty title="Not found" body="This subscription was deleted." action={<Button label="Back" onPress={() => router.back()} />} />
      </View>
    );
  }

  const cat = categoryOf(categories, sub.categoryId);
  const past = isPast(sub);
  const next = past ? null : nextRenewal(sub);
  const fullMonthly = monthlyCost(sub, base, rates);
  const monthly = monthlyCost(costOf(sub), base, rates);
  const spent = lifetimeSpend(costOf(sub), base, rates);
  const shared = isShared(sub);
  const inBase = sub.currency !== base ? convert(sub.amount, sub.currency, base, rates) : null;
  const months = Math.max(0, Math.round(daysBetween(sub.startDate, sub.endDate && sub.endDate < today() ? sub.endDate : today()) / 30.44));
  const history = [...sub.priceHistory].sort((a, b) => b.from.localeCompare(a.from));

  const remove = async () => {
    if (await confirm('Delete subscription?', `${sub.name} and its history will be removed. To keep the history, mark it as cancelled instead.`, 'Delete', true)) {
      deleteSubscription(sub.id);
      router.canGoBack() ? router.back() : router.replace('/');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => <IconButton icon="edit" label="Edit" onPress={() => router.push({ pathname: '/edit', params: { id: sub.id } })} />,
        }}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 64 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm }}>
          <Avatar name={sub.name} color={sub.color ?? cat.color} size={56} />
          <View style={{ flex: 1 }}>
            <T v="h1">{sub.name}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Dot color={cat.color} size={8} />
              <T muted>{cat.name}</T>
              {sub.isTrial ? <T muted>· Free trial</T> : null}
            </View>
          </View>
        </View>

        <Card style={{ marginTop: space.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <T v="hero">{formatMoney(sub.amount, sub.currency)}</T>
            <T muted>{cycleText(sub)}</T>
          </View>
          {inBase != null ? <T muted>≈ {formatMoney(inBase, base)} in {base}</T> : null}
          <View style={{ height: 1, backgroundColor: t.border, marginVertical: space.md }} />
          <Info label={past ? 'Ended' : sub.endDate ? 'Ends' : sub.isTrial ? 'Trial ends' : 'Next renewal'}>
            {past || sub.endDate
              ? formatDate(sub.endDate!, { year: true })
              : next
                ? `${formatDate(next, { year: true })} · ${relativeDays(daysBetween(today(), next))}`
                : '—'}
          </Info>
          <Info label="Per month">{formatMoney(monthly, base)}</Info>
          <Info label="Per year">{formatMoney(monthly * 12, base)}</Info>
          <Info label={past ? 'Total paid' : 'Paid so far'}>
            {formatMoney(spent, base)} over {months} month{months === 1 ? '' : 's'}
          </Info>
          <Info label="Since">{formatDate(sub.startDate, { year: true })}</Info>
          {sub.reminderDays != null && !past ? (
            <Info label="Reminder">{sub.reminderDays === 0 ? 'On the day' : `${sub.reminderDays} day${sub.reminderDays > 1 ? 's' : ''} before`}</Info>
          ) : null}
          {sub.paymentMethod ? <Info label="Paid with">{sub.paymentMethod}</Info> : null}
        </Card>

        {shared ? (
          <Section title="Shared">
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Icon name="users" size={18} color={t.textMuted} />
                <T style={{ flex: 1 }}>{shareSummary(sub)}</T>
              </View>
              <View style={{ height: 1, backgroundColor: t.border, marginVertical: space.md }} />
              <Info label="Full price / month">{formatMoney(fullMonthly, base)}</Info>
              <Info label="Your share / month">{formatMoney(fullMonthly * myShareFactor(sub), base)}</Info>
              {owedFactor(sub) > 0 ? (
                <>
                  <Info label="Owed to you each renewal">{formatMoney(sub.amount * owedFactor(sub), sub.currency)}</Info>
                  <Info label="Per person">{formatMoney(sub.amount / (sub.sharedWith.length + 1), sub.currency)}</Info>
                </>
              ) : null}
            </Card>
          </Section>
        ) : null}

        {sub.notes ? (
          <Section title="Why I have it">
            <Card>
              <T>{sub.notes}</T>
            </Card>
          </Section>
        ) : null}

        <View style={{ gap: space.sm, marginTop: space.xl }}>
          {sub.manageUrl ? <Button icon="link" label="Manage account" onPress={() => Linking.openURL(sub.manageUrl)} /> : null}
          {past || sub.endDate ? (
            <Button kind="secondary" icon="restore" label="I resubscribed" onPress={() => restoreSubscription(sub.id)} />
          ) : (
            <Button kind="secondary" icon="archive" label="Mark as cancelled" onPress={() => setCancelling(true)} />
          )}
        </View>

        {history.length > 1 ? (
          <Section title="Price history">
            <Card style={{ paddingVertical: space.xs }}>
              {history.map((p, i) => (
                <View key={p.from} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}>
                  <T muted>{i === history.length - 1 ? `From ${formatDate(p.from, { year: true })}` : formatDate(p.from, { year: true })}</T>
                  <T>{formatMoney(p.amount, p.currency)}</T>
                </View>
              ))}
            </Card>
          </Section>
        ) : null}

        <Button kind="danger" icon="trash" label="Delete" onPress={remove} style={{ marginTop: space.xxl }} />
      </ScrollView>

      <CancelSheet
        visible={cancelling}
        defaultDate={next ?? today()}
        onClose={() => setCancelling(false)}
        onConfirm={(d) => {
          cancelSubscription(sub.id, d);
          setCancelling(false);
        }}
      />
    </View>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: space.md }}>
      <T muted>{label}</T>
      <T style={{ flexShrink: 1, textAlign: 'right' }}>{children}</T>
    </View>
  );
}

function CancelSheet({ visible, defaultDate, onClose, onConfirm }: { visible: boolean; defaultDate: string; onClose: () => void; onConfirm: (d: string) => void }) {
  const [date, setDate] = useState<string | null>(defaultDate);
  return (
    <Sheet visible={visible} onClose={onClose} title="Mark as cancelled">
      <T muted style={{ marginBottom: space.md }}>
        When does access end? Usually the end of the current billing period. It moves to Past after this date and keeps its price and history.
      </T>
      <DateField value={date} onChange={setDate} />
      <Button label="Confirm" onPress={() => date && onConfirm(date)} disabled={!date} style={{ marginTop: space.lg }} />
    </Sheet>
  );
}
