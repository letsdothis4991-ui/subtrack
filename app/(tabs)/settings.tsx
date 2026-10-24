import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Switch, View } from 'react-native';
import { CurrencyField } from '../../src/components/pickers';
import { Card, Chip, Row, Screen, Section, T, confirm, notify } from '../../src/components/ui';
import { makeBackup, parseBackup, toCSV } from '../../src/lib/backup';
import { formatDate, today } from '../../src/lib/dates';
import type { ThemePref } from '../../src/lib/types';
import { adsSupported, showPrivacyOptions } from '../../src/services/ads';
import { pickTextFile, saveTextFile } from '../../src/services/files';
import { ensurePermission, notificationsSupported } from '../../src/services/notifications';
import { purchasesSupported, useRemoveAds } from '../../src/services/purchases';
import { DEFAULT_SETTINGS, useStore } from '../../src/store';
import { space, useTheme } from '../../src/theme';
import { DEFAULT_CATEGORIES } from '../../src/lib/presets';

const PRIVACY_URL = 'https://github.com/reshpow-rgb/subtrack/blob/main/docs/PRIVACY.md';

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
    useStore.setState({ subscriptions: [], categories: DEFAULT_CATEGORIES, settings: { ...DEFAULT_SETTINGS, adsRemoved: settings.adsRemoved } });
  };

  return (
    <Screen title="Settings">
      <Section title="Currency" style={{ marginTop: 0 }}>
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
            <Row
              icon="bell"
              label="Allow notifications"
              onPress={async () => {
                const ok = await ensurePermission(true);
                notify(ok ? 'Notifications are on' : 'Notifications are blocked', ok ? undefined : 'Enable them for SubTrack in your phone settings.');
              }}
            />
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
          </View>
        </Card>
      </Section>

      {purchasesSupported ? <RemoveAdsSection /> : null}

      <Section title="Your data">
        <Card style={{ paddingVertical: 0 }}>
          <Row icon="download" label="Export backup (JSON)" onPress={exportJson} />
          <Row icon="download" label="Export spreadsheet (CSV)" onPress={exportCsv} />
          <Row icon="upload" label="Import backup" onPress={doImport} />
          <Row icon="trash" label="Erase all data" danger onPress={eraseAll} />
        </Card>
        <T v="small" faint style={{ marginTop: space.sm }}>
          Your data stays on this device{Platform.OS === 'web' ? ' (in this browser)' : ' and in your Google backup'}. Use export/import to move it between the app and the web.
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

function RemoveAdsSection() {
  const t = useTheme();
  const adsRemoved = useStore((s) => s.settings.adsRemoved);
  const iap = useRemoveAds();
  return (
    <Section title="SubTrack Plus">
      <Card style={{ paddingVertical: 0 }}>
        {adsRemoved ? (
          <Row icon="star" label="Ads removed. Thank you!" right={null} />
        ) : (
          <>
            <Row icon="star" label="Remove ads" value={iap.price ?? (iap.available ? '' : 'Unavailable')} onPress={iap.available ? iap.buy : undefined} />
            <Row icon="restore" label="Restore purchase" onPress={iap.restore} />
          </>
        )}
      </Card>
      {!adsRemoved ? (
        <T v="small" faint style={{ marginTop: space.sm }} color={t.textFaint}>
          A one-off purchase that removes ads for good on this Google account.
        </T>
      ) : null}
    </Section>
  );
}
