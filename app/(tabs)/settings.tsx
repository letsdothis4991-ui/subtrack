import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, Switch, View } from 'react-native';
import { CurrencyField } from '../../src/components/pickers';
import { Card, Chip, Row, Screen, Section, T, confirm, notify } from '../../src/components/ui';
import { makeBackup, parseBackup, toCSV } from '../../src/lib/backup';
import { formatDate, today } from '../../src/lib/dates';
import type { ThemePref } from '../../src/lib/types';
import { adsSupported, showPrivacyOptions } from '../../src/services/ads';
import { pickTextFile, saveTextFile } from '../../src/services/files';
import { ensurePermission, notificationsSupported, sendTestReminder } from '../../src/services/notifications';
import { cloudEnabled } from '../../src/services/supabase';
import { AccountSection, PlusSection } from '../../src/components/account';
import { useStore } from '../../src/store';
import { ACCENTS, FREE_ACCENT, space, useTheme, type AccentId } from '../../src/theme';
import { PlusTag } from '../../src/components/PlusGate';

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || 'https://letsdothis4991-ui.github.io/subtrack/privacy.html';

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const settings = useStore((s) => s.settings);
  const rates = useStore((s) => s.rates);
  const subscriptions = useStore((s) => s.subscriptions);
  const categories = useStore((s) => s.categories);
  const updateSettings = useStore((s) => s.updateSettings);
  const refreshRates = useStore((s) => s.refreshRates);
  const importBackup = useStore((s) => s.importBackup);
  const [refreshing, setRefreshing] = useState(false);

  const exportJson = () =>
    saveTextFile(`subtrack-backup-${today()}.json`, JSON.stringify(makeBackup(subscriptions, categories, settings), null, 2), 'application/json');
  const exportCsv = () => saveTextFile(`subtrack-${today()}.csv`, toCSV(subscriptions, categories), 'text/csv');

  const doImport = async () => {
    try {
      const text = await pickTextFile();
      if (!text) return;
      const backup = parseBackup(text);
      const replace = await confirm(
        'Import backup',
        `${backup.subscriptions.length} subscriptions found. Replace your current data? Choose Cancel to merge instead.`,
        'Replace',
        true,
      );
      importBackup(backup, replace ? 'replace' : 'merge');
      notify('Import complete');
    } catch (e) {
      notify('Import failed', e instanceof Error ? e.message : String(e));
    }
  };

  const eraseAll = async () => {
    if (!(await confirm('Erase all data?', 'This removes every subscription and category from this device. Export a backup first if unsure.', 'Erase', true))) return;
    useStore.getState().eraseAll();
  };

  return (
    <Screen title="Settings">
      <AccountSection />
      <PlusSection />

      <Section title="Currency">
        <Card>
          <T muted v="small" style={{ marginBottom: 8 }}>
            Base currency. All totals, charts and budgets are converted to this.
          </T>
          <CurrencyField value={settings.baseCurrency} onChange={(c) => updateSettings({ baseCurrency: c })} />
          <Row
            icon="restore"
            label={refreshing ? 'Updating rates…' : 'Update exchange rates'}
            value={rates.updatedAt ? formatDate(rates.updatedAt.slice(0, 10)) : 'offline rates'}
            onPress={async () => {
              setRefreshing(true);
              await refreshRates();
              setRefreshing(false);
            }}
          />
          <T v="small" faint style={{ marginTop: 8 }}>
            European Central Bank reference rates, refreshed automatically twice a day.
          </T>
        </Card>
      </Section>

      <Section title="Shared subscriptions">
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <T>Count only my share</T>
              <T v="small" faint>
                Totals, charts and budgets use what you actually pay. Turn off to see full prices.
              </T>
            </View>
            <Switch
              value={settings.countMyShareOnly}
              onValueChange={(v) => updateSettings({ countMyShareOnly: v })}
              trackColor={{ true: t.accent, false: t.track }}
              thumbColor="#fff"
            />
          </View>
        </Card>
      </Section>

      <Section title="Reminders">
        <Card>
          {!notificationsSupported ? (
            <T v="small" muted style={{ marginBottom: space.sm }}>
              Push reminders work in the Android app. On the web, upcoming renewals are highlighted on the Subscriptions screen.
            </T>
          ) : null}
          <T v="small" muted style={{ marginBottom: 8 }}>
            Default reminder for new subscriptions
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {[null, 0, 1, 3, 7, 14].map((d) => (
              <Chip
                key={String(d)}
                label={d == null ? 'Off' : d === 0 ? 'Same day' : `${d} day${d > 1 ? 's' : ''} before`}
                selected={settings.defaultReminderDays === d}
                onPress={() => updateSettings({ defaultReminderDays: d })}
              />
            ))}
          </View>
          <T v="small" muted style={{ marginTop: space.lg, marginBottom: 8 }}>
            Time of day
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {[8, 9, 12, 18, 20].map((h) => (
              <Chip key={h} label={`${String(h).padStart(2, '0')}:00`} selected={settings.reminderHour === h} onPress={() => updateSettings({ reminderHour: h })} />
            ))}
          </View>
          {notificationsSupported ? (
            <>
              <Row
                icon="bell"
                label="Allow notifications"
                onPress={async () => {
                  const ok = await ensurePermission(true);
                  if (ok) notify('Notifications are on');
                  else if (await confirm('Notifications are blocked', 'Turn them on for SubTrack in your phone settings so reminders can pop up.', 'Open settings')) Linking.openSettings();
                }}
              />
              <Row
                icon="bell"
                label="Send a test reminder"
                onPress={async () => {
                  const ok = await sendTestReminder();
                  if (ok) notify('Test reminder on its way', 'It will pop up in about 5 seconds.');
                  else if (await confirm('Notifications are blocked', 'Turn them on for SubTrack in your phone settings so reminders can pop up.', 'Open settings')) Linking.openSettings();
                }}
              />
            </>
          ) : null}
        </Card>
      </Section>

      <Section title="Organise">
        <Card style={{ paddingVertical: 0 }}>
          <Row icon="tag" label="Categories" value={String(categories.length)} onPress={() => router.push('/categories')} />
          <View style={{ paddingVertical: 14, gap: 8 }}>
            <T v="small" muted>
              Appearance
            </T>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {(['system', 'light', 'dark'] as ThemePref[]).map((p) => (
                <Chip key={p} label={p[0].toUpperCase() + p.slice(1)} selected={settings.theme === p} onPress={() => updateSettings({ theme: p })} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
              <T v="small" muted>
                Colour
              </T>
              {!settings.plus ? <PlusTag /> : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {(Object.keys(ACCENTS) as AccentId[]).map((id) => {
                const locked = !settings.plus && id !== FREE_ACCENT;
                const selected = (settings.plus ? settings.accent : FREE_ACCENT) === id;
                return (
                  <Pressable
                    key={id}
                    accessibilityLabel={`${ACCENTS[id].name}${locked ? ' (Plus)' : ''}`}
                    onPress={() => (locked ? notify('SubTrack Plus', 'Colour themes come with SubTrack Plus.') : updateSettings({ accent: id }))}
                    style={{ alignItems: 'center', gap: 4, opacity: locked ? 0.45 : 1 }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: t.dark ? ACCENTS[id].dark : ACCENTS[id].light,
                        borderWidth: selected ? 3 : 0,
                        borderColor: t.text,
                      }}
                    />
                    <T v="small" faint style={{ fontSize: 11 }}>
                      {ACCENTS[id].name}
                    </T>
                  </Pressable>
                );
              })}
            </View>
            {Platform.OS === 'android' ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
                  <T v="small" muted>
                    Home-screen widget
                  </T>
                  {!settings.plus ? <PlusTag /> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  {(['light', 'dark', 'accent'] as const).map((w) => (
                    <Chip
                      key={w}
                      label={w === 'accent' ? 'Colour' : w[0].toUpperCase() + w.slice(1)}
                      selected={(settings.plus ? settings.widgetStyle : 'light') === w}
                      onPress={() =>
                        !settings.plus && w !== 'light' ? notify('SubTrack Plus', 'Widget styles come with SubTrack Plus.') : updateSettings({ widgetStyle: w })
                      }
                    />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        </Card>
      </Section>


      <Section title="Your data">
        <Card style={{ paddingVertical: 0 }}>
          <Row icon="download" label="Export backup (JSON)" onPress={exportJson} />
          <Row icon="download" label="Export spreadsheet (CSV)" onPress={exportCsv} />
          <Row icon="upload" label="Import backup" onPress={doImport} />
          <Row icon="upload" label="Import from CSV" onPress={() => router.push('/import')} />
          <Row icon="trash" label="Erase all data" danger onPress={eraseAll} />
        </Card>
        <T v="small" faint style={{ marginTop: space.sm }}>
          Your data is stored on this device{Platform.OS === 'web' ? ' (in this browser)' : ''}{cloudEnabled ? ', and in your SubTrack account when you sign in to sync' : '. Use export/import to move it between devices'}.
        </T>
      </Section>

      <Section title="About">
        <Card style={{ paddingVertical: 0 }}>
          {adsSupported ? <Row icon="shield" label="Ad privacy choices" onPress={showPrivacyOptions} /> : null}
          <Row icon="note" label="Privacy policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Row icon="globe" label="Version" value="1.0.0" />
        </Card>
      </Section>
    </Screen>
  );
}
