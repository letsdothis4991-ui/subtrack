import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { formatMoney } from '../lib/currency';
import { usePlusOffer } from '../services/nudge';
import { useStore } from '../store';
import { space, useTheme } from '../theme';
import { Icon } from './Icon';
import { Button, Card, T } from './ui';

export const usePlus = () => useStore((s) => s.settings.plus);

/** Shown in place of a Plus feature for free users. */
export function PlusLocked({ title, body }: { title: string; body: string }) {
  const t = useTheme();
  const router = useRouter();
  return (
    <Card style={{ gap: space.sm, alignItems: 'flex-start' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name="star" size={18} color={t.accent} />
        <T v="bodyStrong">{title}</T>
      </View>
      <T v="small" muted>
        {body}
      </T>
      <Button small label="See SubTrack Plus" onPress={() => router.push('/settings')} />
    </Card>
  );
}

/** Small "PLUS" tag for locked options. */
export function PlusTag() {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: t.accentSoft }}>
      <T v="small" color={t.accent} style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
        PLUS
      </T>
    </View>
  );
}

/** A gentle, dismissible Plus prompt after cancelling something or finding savings. */
export function PlusNudge() {
  const t = useTheme();
  const router = useRouter();
  const offer = usePlusOffer((s) => s.offer);
  const dismiss = usePlusOffer((s) => s.dismiss);
  const plus = usePlus();
  const base = useStore((s) => s.settings.baseCurrency);
  if (!offer || plus) return null;
  const amount = formatMoney(offer.yearly, base, { compact: true });
  return (
    <Card style={{ marginTop: space.md, gap: space.sm, backgroundColor: t.accentSoft, borderColor: t.accentSoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
        <Icon name="star" size={18} color={t.accent} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyStrong" color={t.accent}>
            {offer.kind === 'cancelled' ? `Nice, that's ${amount} a year back in your pocket` : `You found ${amount} a year you could save`}
          </T>
          <T v="small" color={t.accent}>
            SubTrack is free. If it's helping, Plus is one small payment that removes the ads and adds the renewal calendar and year in review.
          </T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button
          small
          label="See Plus"
          onPress={() => {
            dismiss();
            router.push('/settings');
          }}
        />
        <Button small kind="ghost" label="Not now" onPress={dismiss} />
      </View>
    </Card>
  );
}
