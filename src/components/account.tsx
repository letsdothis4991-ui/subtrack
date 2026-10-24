import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { formatDate } from '../lib/dates';
import { purchasesSupported, usePlusPurchase } from '../services/purchases';
import { cloudEnabled } from '../services/supabase';
import { deleteAccount, googleSignInSupported, sendCode, signInWithGoogle, signOut, syncNow, useSync, verifyCode } from '../services/sync';
import { useStore } from '../store';
import { space, useTheme } from '../theme';
import { Icon } from './Icon';
import { Button, Card, Input, Row, Section, T, confirm, notify } from './ui';

/** Sign-in and sync status. Hidden when the build has no Supabase settings. */
export function AccountSection() {
  const t = useTheme();
  const { status, email, lastSynced, error } = useSync();
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!cloudEnabled) return null;

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

  if (status === 'signed-out') {
    return (
      <Section title="Sync" style={{ marginTop: 0 }}>
        <Card style={{ gap: space.sm }}>
          <T v="bodyStrong">Use SubTrack on your phone and the web</T>
          <T v="small" muted>
            Sign in to back up and sync your subscriptions between devices. Free; we'll email you a 6-digit code, no password.
          </T>
          {!sent ? (
            <>
              <Input value={address} onChangeText={setAddress} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              <Button
                label={busy ? 'Sending…' : 'Email me a code'}
                disabled={busy || !/.+@.+\..+/.test(address)}
                onPress={() => run(async () => {
                  await sendCode(address);
                  setSent(true);
                })}
              />
            </>
          ) : (
            <>
              <T v="small">Code sent to {address}. Check your inbox (and spam).</T>
              <Input value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" maxLength={6} autoFocus />
              <Button label={busy ? 'Checking…' : 'Sign in'} disabled={busy || code.trim().length < 6} onPress={() => run(() => verifyCode(address, code))} />
              <Button kind="ghost" small label="Use a different email" onPress={() => setSent(false)} />
            </>
          )}
          {googleSignInSupported ? <Button kind="secondary" label="Continue with Google" onPress={() => run(signInWithGoogle)} /> : null}
        </Card>
      </Section>
    );
  }

  return (
    <Section title="Sync" style={{ marginTop: 0 }}>
      <Card style={{ paddingVertical: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.border }}>
          {status === 'syncing' ? <ActivityIndicator size="small" color={t.accent} /> : <Icon name={status === 'error' ? 'x' : 'check'} size={18} color={status === 'error' ? t.danger : t.accent} />}
          <View style={{ flex: 1 }}>
            <T>{email}</T>
            <T v="small" muted>
              {status === 'error' ? `Sync failed: ${error}` : status === 'syncing' ? 'Syncing…' : lastSynced ? `Synced ${formatDate(lastSynced.slice(0, 10))} ${lastSynced.slice(11, 16)} UTC` : 'Signed in'}
            </T>
          </View>
        </View>
        <Row icon="restore" label="Sync now" onPress={() => syncNow()} />
        <Row icon="x" label="Sign out" onPress={() => run(signOut)} />
        <Row
          icon="trash"
          label="Delete account"
          danger
          onPress={async () => {
            if (await confirm('Delete your account?', 'Your cloud copy and account are deleted. Data on this device stays.', 'Delete', true)) run(deleteAccount);
          }}
        />
      </Card>
    </Section>
  );
}

export function PlusSection() {
  const t = useTheme();
  const plus = useStore((s) => s.settings.plus);
  const signedIn = useSync((s) => s.status !== 'signed-out');

  return (
    <Section title="SubTrack Plus">
      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="star" size={18} color={t.accent} />
          <T v="bodyStrong">{plus ? 'You have Plus. Thank you!' : 'One payment, yours for good'}</T>
        </View>
        {[
          'No ads, anywhere in the app',
          'Supports an independent, private app',
        ].map((line) => (
          <View key={line} style={{ flexDirection: 'row', gap: space.sm }}>
            <Icon name="check" size={16} color={plus ? t.accent : t.textMuted} />
            <T v="small" muted style={{ flex: 1 }}>
              {line}
            </T>
          </View>
        ))}
        {!plus ? purchasesSupported ? <BuyButtons /> : (
          <T v="small" faint>
            Get Plus in the Android app, then sign in here with the same account to unlock it on the web.
          </T>
        ) : null}
      </Card>
    </Section>
  );
}

function BuyButtons() {
  const iap = usePlusPurchase();
  return (
    <View style={{ gap: space.sm, marginTop: space.xs }}>
      <Button label={iap.available ? `Get Plus · ${iap.price}` : 'Plus unavailable right now'} disabled={!iap.available} onPress={iap.buy} />
      <Button kind="ghost" small label="Restore purchase" onPress={iap.restore} />
    </View>
  );
}
