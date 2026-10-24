import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { DateField } from '../src/components/DatePicker';
import { Icon } from '../src/components/Icon';
import { CategoryPicker, CurrencyField } from '../src/components/pickers';
import { Avatar, Button, Chip, Field, IconButton, Input, Segmented, T, styles } from '../src/components/ui';
import { nextRenewal } from '../src/lib/calc';
import { nthBilling, today } from '../src/lib/dates';
import { PRESETS, type ServicePreset } from '../src/lib/presets';
import type { Cycle, ShareMode } from '../src/lib/types';
import { asMyShare, owedFactor } from '../src/lib/calc';
import { formatMoney } from '../src/lib/currency';
import { useStore, type SubscriptionInput } from '../src/store';
import { space, useTheme } from '../src/theme';

const REMINDER_OPTIONS: (number | null)[] = [null, 0, 1, 2, 3, 7, 14];

function normaliseUrl(url: string): string {
  const u = url.trim();
  if (!u) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`;
}

export default function EditSubscription() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useStore((s) => s.subscriptions.find((x) => x.id === id));
  const settings = useStore((s) => s.settings);
  const addSubscription = useStore((s) => s.addSubscription);
  const updateSubscription = useStore((s) => s.updateSubscription);

  const [picking, setPicking] = useState(!existing);
  const [query, setQuery] = useState('');

  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [currency, setCurrency] = useState(existing?.currency ?? settings.baseCurrency);
  const [cycle, setCycle] = useState<Cycle>(existing?.cycle ?? 'monthly');
  const [interval, setInterval] = useState(existing?.interval ?? 1);
  const [next, setNext] = useState<string | null>(existing ? nextRenewal(existing) ?? existing.anchorDate : null);
  const [start, setStart] = useState<string | null>(existing?.startDate ?? null);
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? 'streaming');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [manageUrl, setManageUrl] = useState(existing?.manageUrl ?? '');
  const [paymentMethod, setPaymentMethod] = useState(existing?.paymentMethod ?? '');
  const [reminderDays, setReminderDays] = useState<number | null>(existing ? existing.reminderDays : settings.defaultReminderDays);
  const [isTrial, setIsTrial] = useState(existing?.isTrial ?? false);
  const [color, setColor] = useState<string | null>(existing?.color ?? null);
  const [logo, setLogo] = useState<string | null>(existing?.logo ?? null);
  const [annualPrice, setAnnualPrice] = useState(existing?.annualPrice ? String(existing.annualPrice) : '');
  const [shared, setShared] = useState((existing?.sharedWith?.length ?? 0) > 0 || existing?.shareMode === 'they_pay');
  const [sharedWith, setSharedWith] = useState<string[]>(existing?.sharedWith ?? []);
  const [shareMode, setShareMode] = useState<ShareMode>(existing?.shareMode ?? 'split');
  const [person, setPerson] = useState('');

  const presets = useMemo(() => PRESETS.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())), [query]);

  const applyPreset = (p: ServicePreset | null) => {
    if (p) {
      setName(p.name);
      setCategoryId(p.categoryId);
      setManageUrl(p.manageUrl);
      setColor(p.color);
      setLogo(p.logo ?? null);
    } else if (query.trim()) {
      setName(query.trim());
    }
    setPicking(false);
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const closeButton = () => <IconButton icon="x" label="Close" onPress={close} />;

  const amountNum = Number(amount.replace(',', '.'));
  const valid = name.trim().length > 0 && amount.trim() !== '' && Number.isFinite(amountNum) && amountNum >= 0 && next != null;

  const save = () => {
    if (!valid || !next) return;
    // Default start: one billing period before the next renewal, never in the future.
    const defaultStart = nthBilling(next, cycle, interval, -1);
    const startDate = start ?? (defaultStart < today() ? defaultStart : today());
    const input: SubscriptionInput = {
      name: name.trim(),
      amount: amountNum,
      currency,
      cycle,
      interval: Math.max(1, interval),
      anchorDate: next,
      startDate: startDate > next ? next : startDate,
      endDate: existing?.endDate ?? null,
      categoryId,
      notes: notes.trim(),
      manageUrl: normaliseUrl(manageUrl),
      paymentMethod: paymentMethod.trim(),
      reminderDays,
      isTrial,
      color,
      logo,
      annualPrice: cycle !== 'yearly' && Number(annualPrice.replace(',', '.')) > 0 ? Number(annualPrice.replace(',', '.')) : null,
      sharedWith: shared ? sharedWith : [],
      shareMode: shared ? shareMode : 'split',
    };
    if (existing) updateSubscription(existing.id, input);
    else addSubscription(input);
    close();
  };

  if (picking) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Stack.Screen options={{ title: 'Add subscription', headerLeft: closeButton }} />
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: space.md, paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
          <Input placeholder="Search services or type a name" value={query} onChangeText={setQuery} autoFocus={Platform.OS === 'web'} />
          <Pressable onPress={() => router.replace('/smart-add')} style={[styles.listRow, { borderBottomColor: t.border }]}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="star" size={18} color={t.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <T>Smart add</T>
              <T v="small" faint>
                From a screenshot, an email or a CSV file
              </T>
            </View>
            <Icon name="chevronRight" size={18} color={t.textFaint} />
          </Pressable>
          <Pressable onPress={() => applyPreset(null)} style={[styles.listRow, { borderBottomColor: t.border }]}>
            <Avatar name={query || '+'} color={t.textFaint} size={36} />
            <T style={{ flex: 1 }}>{query.trim() ? `Add “${query.trim()}”` : 'Custom subscription'}</T>
          </Pressable>
          {presets.map((p) => (
            <Pressable key={p.name} onPress={() => applyPreset(p)} style={({ pressed }) => [styles.listRow, { borderBottomColor: t.border, opacity: pressed ? 0.6 : 1 }]}>
              <Avatar name={p.name} color={p.color} size={36} logo={p.logo} />
              <T style={{ flex: 1 }}>{p.name}</T>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? 'Edit subscription' : 'New subscription', headerLeft: closeButton }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: space.md, paddingBottom: 64 }]} keyboardShouldPersistTaps="handled">
        <Field label="Name">
          <Input value={name} onChangeText={setName} placeholder="e.g. Netflix" />
        </Field>

        <Field label="Cost">
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Input value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" style={{ flex: 1, minWidth: 0 }} />
            <View style={{ width: 110 }}>
              <CurrencyField value={currency} onChange={setCurrency} />
            </View>
          </View>
        </Field>

        <Field label="Billed">
          <Segmented<Cycle>
            value={cycle}
            onChange={setCycle}
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
            <T v="small" muted>
              Every
            </T>
            {[1, 2, 3, 6].map((n) => (
              <Chip key={n} label={String(n)} selected={interval === n} onPress={() => setInterval(n)} />
            ))}
            <T v="small" muted>
              {cycle === 'weekly' ? 'week(s)' : cycle === 'monthly' ? 'month(s)' : cycle === 'quarterly' ? 'quarter(s)' : 'year(s)'}
            </T>
          </View>
        </Field>

        {cycle !== 'yearly' ? (
          <Field label="Annual plan price (optional)" hint="If the service offers a yearly plan, enter its price and Insights will show what you'd save by switching.">
            <Input value={annualPrice} onChangeText={setAnnualPrice} placeholder={`Yearly price in ${currency}`} keyboardType="decimal-pad" />
          </Field>
        ) : null}

        <Field label={isTrial ? 'Trial ends / first charge' : 'Next renewal'}>
          <DateField value={next} onChange={setNext} />
        </Field>

        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: space.lg }]}>
          <View style={{ flex: 1 }}>
            <T>Free trial</T>
            <T v="small" faint>
              Get a "trial ends" reminder instead of a renewal one
            </T>
          </View>
          <Switch value={isTrial} onValueChange={setIsTrial} trackColor={{ true: t.accent, false: t.track }} thumbColor="#fff" />
        </View>

        <Field label="Category">
          <CategoryPicker value={categoryId} onChange={setCategoryId} />
        </Field>

        <Field label="Remind me">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {REMINDER_OPTIONS.map((d) => (
              <Chip
                key={String(d)}
                label={d == null ? 'Off' : d === 0 ? 'On the day' : `${d}d before`}
                selected={reminderDays === d}
                onPress={() => setReminderDays(d)}
              />
            ))}
          </View>
        </Field>

        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: space.md }]}>
          <View style={{ flex: 1 }}>
            <T>Shared with others</T>
            <T v="small" faint>
              Family plans, split accounts, or someone else's plan you're on
            </T>
          </View>
          <Switch value={shared} onValueChange={setShared} trackColor={{ true: t.accent, false: t.track }} thumbColor="#fff" />
        </View>
        {shared ? (
          <View style={{ marginBottom: space.lg, padding: space.md, borderRadius: 12, backgroundColor: t.surfaceAlt, gap: space.sm }}>
            <Segmented<ShareMode>
              value={shareMode}
              onChange={setShareMode}
              options={[
                { value: 'split', label: 'Split equally' },
                { value: 'i_pay', label: 'I pay' },
                { value: 'they_pay', label: 'They pay' },
              ]}
            />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Input
                value={person}
                onChangeText={setPerson}
                placeholder={shareMode === 'they_pay' ? 'Who pays? (optional)' : 'Add a name'}
                style={{ flex: 1, minWidth: 0 }}
                onSubmitEditing={() => {
                  if (person.trim()) setSharedWith([...sharedWith, person.trim()]);
                  setPerson('');
                }}
                returnKeyType="done"
              />
              <Button
                kind="secondary"
                label="Add"
                disabled={!person.trim()}
                onPress={() => {
                  setSharedWith([...sharedWith, person.trim()]);
                  setPerson('');
                }}
              />
            </View>
            {sharedWith.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {sharedWith.map((n, i) => (
                  <Chip key={`${n}-${i}`} label={`${n}  ×`} onPress={() => setSharedWith(sharedWith.filter((_, j) => j !== i))} />
                ))}
              </View>
            ) : null}
            <T v="small" muted>
              {(() => {
                const preview = { amount: Number.isFinite(amountNum) ? amountNum : 0, priceHistory: [], sharedWith, shareMode } as never;
                const mine = asMyShare(preview).amount;
                if (shareMode === 'they_pay') return 'Counts as free for you. Still tracked so you know what you rely on.';
                if (shareMode === 'i_pay')
                  return sharedWith.length
                    ? `You pay ${formatMoney(amountNum || 0, currency)}; the others owe you ${formatMoney((amountNum || 0) * owedFactor(preview), currency)} in total each time.`
                    : 'Add who you pay for.';
                return sharedWith.length ? `Your share: ${formatMoney(mine, currency)} (${sharedWith.length + 1} ways)` : 'Add who you split with.';
              })()}
            </T>
          </View>
        ) : null}

        <Field label="Why I have it" hint="e.g. “Watching The Bear”, “Work tool, expense it”. You'll see this when deciding whether to cancel.">
          <Input value={notes} onChangeText={setNotes} placeholder="Notes" multiline />
        </Field>

        <Field label="Manage account link" hint="Where to cancel or change your plan.">
          <Input value={manageUrl} onChangeText={setManageUrl} placeholder="https://" autoCapitalize="none" keyboardType="url" autoCorrect={false} />
        </Field>

        <Field label="Paid with (optional)">
          <Input value={paymentMethod} onChangeText={setPaymentMethod} placeholder="e.g. Visa •• 4021, PayPal" />
        </Field>

        <Field label="Started (optional)" hint="Used for history charts and total spent. Defaults to one billing period before the next renewal.">
          <DateField value={start} onChange={setStart} placeholder="Not set" clearable />
        </Field>

        <Button label={existing ? 'Save changes' : 'Add subscription'} onPress={save} disabled={!valid} />
        {existing && existing.amount !== amountNum && valid ? (
          <T v="small" faint style={{ marginTop: space.sm, textAlign: 'center' }}>
            {amountNum > existing.amount
              ? `Price rise of ${Math.round(((amountNum - existing.amount) / existing.amount) * 100)}% from today. It'll show under Price changes in Insights.`
              : 'The price change applies from today. Earlier charges keep the old price in your history.'}
          </T>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
