import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Icon } from '../src/components/Icon';
import { Avatar, Button, Card, T, notify, styles } from '../src/components/ui';
import { formatMoney } from '../src/lib/currency';
import { formatDate } from '../src/lib/dates';
import { draftNextRenewal, draftsFromCSV, type Draft } from '../src/lib/importing';
import { logoOf } from '../src/lib/logo';
import { PRESETS } from '../src/lib/presets';
import { pickTextFile } from '../src/services/files';
import { categoryOf, useStore } from '../src/store';
import { space, useTheme } from '../src/theme';

/** Import subscriptions from a CSV file, with a review step before anything is added. */
export default function ImportCsv() {
  const t = useTheme();
  const router = useRouter();
  const settings = useStore((s) => s.settings);
  const categories = useStore((s) => s.categories);
  const existing = useStore((s) => s.subscriptions);
  const addSubscription = useStore((s) => s.addSubscription);

  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const showResults = (found: Draft[], note?: string) => {
    setDrafts(found);
    // Pre-select everything that isn't already tracked.
    const names = new Set(existing.map((s) => s.name.toLowerCase()));
    setSelected(new Set(found.map((d, i) => (names.has(d.name.toLowerCase()) ? -1 : i)).filter((i) => i >= 0)));
    if (note) notify(note);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify('Something went wrong', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const importCsv = () =>
    run(async () => {
      const csv = await pickTextFile('text/csv,.csv,text/plain');
      if (!csv) return;
      const { drafts: found, skipped } = draftsFromCSV(csv, categories, settings.baseCurrency);
      showResults(found, skipped ? `${skipped} row${skipped > 1 ? 's' : ''} skipped (missing name or amount).` : undefined);
    });

  const addSelected = () => {
    const chosen = (drafts ?? []).filter((_, i) => selected.has(i));
    for (const d of chosen) {
      const preset = PRESETS.find((p) => p.name.toLowerCase() === d.name.toLowerCase());
      const next = draftNextRenewal(d);
      addSubscription({
        name: d.name,
        amount: d.amount,
        currency: d.currency,
        cycle: d.cycle,
        interval: d.interval || 1,
        anchorDate: next,
        startDate: next,
        endDate: null,
        categoryId: categories.some((c) => c.id === d.category) ? d.category : preset?.categoryId ?? 'other',
        notes: '',
        manageUrl: preset?.manageUrl ?? '',
        paymentMethod: '',
        reminderDays: settings.defaultReminderDays,
        isTrial: d.isTrial,
        color: preset?.color ?? null,
        logo: preset?.logo ?? null,
        annualPrice: null,
        sharedWith: [],
        shareMode: 'split',
      });
    }
    notify(`Added ${chosen.length} subscription${chosen.length === 1 ? '' : 's'}`);
    router.canGoBack() ? router.back() : router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: 'Import from CSV' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: space.md, paddingBottom: 64 }]}>
        {drafts == null ? (
          <>
            <View style={{ gap: space.md }}>
              <T muted>
                Import a spreadsheet (CSV) with at least Name and Amount columns. Cycle, Currency, Next renewal and Category are picked up when present. Files
                exported from SubTrack work too.
              </T>
              <Card style={{ backgroundColor: t.surfaceAlt, borderColor: t.surfaceAlt }}>
                <T v="small" muted style={{ fontFamily: 'monospace' }}>
                  Name,Amount,Currency,Cycle,Next renewal{'\n'}Netflix,15.49,USD,monthly,2026-11-05{'\n'}Spotify,169.99,USD,yearly,2027-02-01
                </T>
              </Card>
            </View>

            <View style={{ marginTop: space.xl }}>
              {busy ? (
                <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.lg }}>
                  <ActivityIndicator color={t.accent} />
                  <T muted>Importing…</T>
                </View>
              ) : (
                <Button icon="upload" label="Choose CSV file" onPress={importCsv} />
              )}
            </View>
          </>
        ) : (
          <>
            <T muted style={{ marginBottom: space.md }}>
              {drafts.length ? 'Check what was found. Tap to include or skip; you can edit details after adding.' : 'Nothing found.'}
            </T>
            {drafts.map((d, i) => {
              const on = selected.has(i);
              const cat = categoryOf(categories, d.category);
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    const next = new Set(selected);
                    on ? next.delete(i) : next.add(i);
                    setSelected(next);
                  }}
                  style={[styles.listRow, { borderBottomColor: t.border, opacity: on ? 1 : 0.45 }]}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: on ? t.accent : t.border, backgroundColor: on ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Icon name="check" size={14} color={t.onAccent} strokeWidth={3} /> : null}
                  </View>
                  <Avatar name={d.name} color={PRESETS.find((p) => p.name.toLowerCase() === d.name.toLowerCase())?.color ?? cat.color} size={34} logo={logoOf({ name: d.name })} />
                  <View style={{ flex: 1 }}>
                    <T v="bodyStrong" numberOfLines={1}>
                      {d.name}
                      {d.isTrial ? ' · trial' : ''}
                    </T>
                    <T v="small" muted>
                      {cat.name} · next {formatDate(draftNextRenewal(d))}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T v="bodyStrong">{formatMoney(d.amount, d.currency)}</T>
                    <T v="small" faint>
                      {d.cycle}
                    </T>
                  </View>
                </Pressable>
              );
            })}
            <View style={{ gap: space.sm, marginTop: space.xl }}>
              <Button label={`Add ${selected.size} subscription${selected.size === 1 ? '' : 's'}`} disabled={selected.size === 0} onPress={addSelected} />
              <Button kind="ghost" label="Start over" onPress={() => setDrafts(null)} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
