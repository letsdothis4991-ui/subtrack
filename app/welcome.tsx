import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateField } from '../src/components/DatePicker';
import { Icon } from '../src/components/Icon';
import { CurrencyField } from '../src/components/pickers';
import { Avatar, Button, Card, Field, Input, Screen, Segmented, T, styles } from '../src/components/ui';
import { CURRENCIES } from '../src/lib/currency';
import { POPULAR, PRESETS, type ServicePreset } from '../src/lib/presets';
import { pickComplete, subscriptionFromPick, type SetupPick } from '../src/lib/setup';
import type { Cycle } from '../src/lib/types';
import { useStore } from '../src/store';
import { radius, space, useTheme } from '../src/theme';

type Step = 'currency' | 'services' | 'details';

const popular = POPULAR.map((name) => PRESETS.find((p) => p.name === name)).filter((p): p is ServicePreset => !!p);

/** First-run setup: pick a currency, tick the services you pay for, then add a price and renewal date for each. */
export default function Welcome() {
  const t = useTheme();
  const router = useRouter();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const addSubscription = useStore((s) => s.addSubscription);
  const loadSampleData = useStore((s) => s.loadSampleData);

  const [step, setStep] = useState<Step>('currency');
  const [currency, setCurrency] = useState(settings.baseCurrency);
  const [picks, setPicks] = useState<SetupPick[]>([]);
  const [query, setQuery] = useState('');

  const leave = () => {
    updateSettings({ baseCurrency: currency, setupDone: true });
    router.replace('/');
  };

  const toggle = (preset: ServicePreset) =>
    setPicks((list) =>
      list.some((p) => p.preset.name === preset.name)
        ? list.filter((p) => p.preset.name !== preset.name)
        : [...list, { preset, amount: '', cycle: 'monthly', next: null }],
    );
  const patch = (name: string, change: Partial<SetupPick>) => setPicks((list) => list.map((p) => (p.preset.name === name ? { ...p, ...change } : p)));

  const ready = picks.filter(pickComplete);
  const finish = () => {
    for (const p of ready) {
      const input = subscriptionFromPick(p, currency, settings.defaultReminderDays);
      if (input) addSubscription(input);
    }
    leave();
  };

  if (step === 'currency') {
    const name = CURRENCIES.find((c) => c.code === currency)?.name;
    return (
      <Screen
        title="Welcome to SubTrack"
        footer={
          <Footer>
            <Button label="Continue" onPress={() => setStep('services')} />
            <Button
              kind="ghost"
              label="Explore with sample data"
              onPress={() => {
                updateSettings({ baseCurrency: currency });
                loadSampleData();
                leave();
              }}
            />
          </Footer>
        }
      >
        <T muted>Every subscription in one place, with a reminder before each renewal. No bank login, and your data stays on your phone.</T>
        <View style={{ marginTop: space.xl }}>
          <Field label="Your currency" hint={`Totals and budgets are shown in ${name ?? currency}. Each subscription can still have its own currency.`}>
            <CurrencyField value={currency} onChange={setCurrency} />
          </Field>
        </View>
      </Screen>
    );
  }

  if (step === 'services') {
    const q = query.trim().toLowerCase();
    const shown = q ? PRESETS.filter((p) => p.name.toLowerCase().includes(q)) : popular;
    return (
      <Screen
        title="What do you pay for?"
        footer={
          <Footer>
            {picks.length > 0 ? (
              <Button label={`Continue with ${picks.length}`} onPress={() => setStep('details')} />
            ) : (
              <Button kind="secondary" label="I'll add them myself" onPress={leave} />
            )}
            <Button kind="ghost" label="Back" onPress={() => setStep('currency')} />
          </Footer>
        }
      >
        <T muted style={{ marginBottom: space.md }}>
          Tap the ones you have. You can add anything else later.
        </T>
        <Input placeholder="Search all services" value={query} onChangeText={setQuery} autoCorrect={false} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
          {shown.map((p) => (
            <ServiceTile key={p.name} preset={p} selected={picks.some((x) => x.preset.name === p.name)} onPress={() => toggle(p)} />
          ))}
        </View>
        {shown.length === 0 ? (
          <T muted style={{ textAlign: 'center', paddingVertical: space.xl }}>
            Not in the list. You can add it as a custom subscription later.
          </T>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      title="Add the details"
      footer={
        <Footer>
          <Button label={ready.length > 0 ? `Add ${ready.length} subscription${ready.length === 1 ? '' : 's'}` : 'Skip for now'} onPress={finish} />
          <Button kind="ghost" label="Back" onPress={() => setStep('services')} />
        </Footer>
      }
    >
      <T muted style={{ marginBottom: space.md }}>
        A price and the next renewal date are all SubTrack needs. Leave one blank to skip it for now.
      </T>
      <View style={{ gap: space.md }}>
        {picks.map((p) => (
          <Card key={p.preset.name} style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Avatar name={p.preset.name} color={p.preset.color} size={32} logo={p.preset.logo} />
              <T v="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                {p.preset.name}
              </T>
              {pickComplete(p) ? <Icon name="check" size={18} color={t.accent} /> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <Input
                value={p.amount}
                onChangeText={(amount) => patch(p.preset.name, { amount })}
                placeholder={`Price in ${currency}`}
                keyboardType="decimal-pad"
                accessibilityLabel={`${p.preset.name} price`}
                style={{ flex: 1, minWidth: 0 }}
              />
              <View style={{ width: 168 }}>
                <Segmented<Cycle>
                  value={p.cycle}
                  onChange={(cycle) => patch(p.preset.name, { cycle })}
                  options={[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly', label: 'Yearly' },
                  ]}
                />
              </View>
            </View>
            <DateField value={p.next} onChange={(next) => patch(p.preset.name, { next })} placeholder="Next renewal date" />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function ServiceTile({ preset, selected, onPress }: { preset: ServicePreset; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={preset.name}
      style={({ pressed }) => ({
        width: '31.5%',
        alignItems: 'center',
        gap: 6,
        paddingVertical: space.md,
        paddingHorizontal: space.xs,
        borderRadius: radius.md,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? t.accent : t.border,
        backgroundColor: selected ? t.accentSoft : t.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Avatar name={preset.name} color={preset.color} size={40} logo={preset.logo} />
      <T v="small" numberOfLines={2} style={{ textAlign: 'center' }}>
        {preset.name}
      </T>
      {selected ? (
        <View style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={13} color={t.onAccent} />
        </View>
      ) : null}
    </Pressable>
  );
}

function Footer({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.bg, paddingTop: space.md, paddingBottom: Math.max(insets.bottom, space.md) }}>
      <View style={[styles.content, { gap: space.xs }]}>{children}</View>
    </View>
  );
}
