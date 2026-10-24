import { useRouter } from 'expo-router';
import { View } from 'react-native';
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
