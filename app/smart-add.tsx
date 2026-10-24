import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { Icon } from '../src/components/Icon';
import { Avatar, Button, Card, Input, Segmented, T, notify, styles } from '../src/components/ui';
import { formatMoney } from '../src/lib/currency';
import { formatDate } from '../src/lib/dates';
import { draftNextRenewal, draftsFromCSV, type Draft } from '../src/lib/importing';
import { logoOf } from '../src/lib/logo';
import { PRESETS } from '../src/lib/presets';
import { pickTextFile } from '../src/services/files';
import { extractSubscriptions, pickScreenshot, type PickedImage } from '../src/services/smartAdd';
import { cloudEnabled } from '../src/services/supabase';
import { useSync } from '../src/services/sync';
import { categoryOf, useStore } from '../src/store';
import { space, useTheme } from '../src/theme';

type Mode = 'photo' | 'text' | 'csv';

export default function SmartAdd() {
  const t = useTheme();
  const router = useRouter();
  const settings = useStore((s) => s.settings);
  const categories = useStore((s) => s.categories);
  const existing = useStore((s) => s.subscriptions);
  const addSubscription = useStore((s) => s.addSubscription);
  const signedIn = useSync((s) => s.status !== 'signed-out');

  const [mode, setMode] = useState<Mode>('photo');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const aiMode = mode !== 'csv';
  const aiBlocked = aiMode && (!cloudEnabled ? 'unavailable' : !settings.plus ? 'plus' : !signedIn ? 'signin' : null);

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

  const analyse = () =>
    run(async () => {
      const found = await extractSubscriptions(mode === 'photo' ? { image: image! } : { text }, settings.baseCurrency);
      showResults(found, found.length ? undefined : 'No subscriptions found. Try a clearer screenshot or more of the email.');
    });

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
      <Stack.Screen options={{ title: 'Smart add' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: space.md, paddingBottom: 64 }]}>
        {drafts == null ? (
          <>
            <Segmented<Mode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'photo', label: 'Screenshot' },
                { value: 'text', label: 'Paste email' },
                { value: 'csv', label: 'CSV file' },
              ]}
            />

            {mode === 'photo' ? (
              <View style={{ marginTop: space.lg, gap: space.md }}>
                <T muted>
                  Pick a screenshot of a receipt, your app-store subscriptions page, or a bank statement. SubTrack reads it and lists what it finds for you to
                  check.
                </T>
                <Pressable
                  onPress={() => run(async () => setImage(await pickScreenshot()))}
                  style={{ height: image ? undefined : 160, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: t.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: t.surface }}
                >
                  {image ? (
                    <Image source={{ uri: image.uri }} style={{ width: '100%', aspectRatio: 0.6 }} resizeMode="contain" />
                  ) : (
                    <>
                      <Icon name="upload" size={26} color={t.textMuted} />
                      <T muted style={{ marginTop: 8 }}>
                        Choose screenshot
                      </T>
                    </>
                  )}
                </Pressable>
              </View>
            ) : mode === 'text' ? (
              <View style={{ marginTop: space.lg, gap: space.md }}>
                <T muted>Paste a billing email, receipt or a list of your subscriptions in any format.</T>
                <Input value={text} onChangeText={setText} multiline placeholder="Paste here…" style={{ minHeight: 200 }} />
              </View>
            ) : (
              <View style={{ marginTop: space.lg, gap: space.md }}>
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
            )}

            <View style={{ marginTop: space.xl }}>
              {aiBlocked ? (
                <Card style={{ gap: space.sm }}>
                  <T v="bodyStrong">{aiBlocked === 'unavailable' ? 'Not available in this build' : aiBlocked === 'plus' ? 'Part of SubTrack Plus' : 'Sign in to use smart add'}</T>
                  <T v="small" muted>
                    {aiBlocked === 'unavailable'
                      ? 'Reading screenshots and emails needs the cloud features to be set up. CSV import works without them.'
                      : aiBlocked === 'plus'
                        ? 'Plus adds screenshot and email reading, removes ads and supports development. CSV import is free.'
                        : 'Smart add runs through your SubTrack account so your Plus purchase and data stay together.'}
                  </T>
                  {aiBlocked !== 'unavailable' ? <Button small label={aiBlocked === 'plus' ? 'See SubTrack Plus' : 'Sign in'} onPress={() => router.push('/settings')} /> : null}
                </Card>
              ) : busy ? (
                <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.lg }}>
                  <ActivityIndicator color={t.accent} />
                  <T muted>{aiMode ? 'Reading…' : 'Importing…'}</T>
                </View>
              ) : mode === 'csv' ? (
                <Button icon="upload" label="Choose CSV file" onPress={importCsv} />
              ) : (
                <Button label="Find subscriptions" icon="search" onPress={analyse} disabled={mode === 'photo' ? !image : !text.trim()} />
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
