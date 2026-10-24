import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Avatar, Button, Chip, T, styles } from '../src/components/ui';
import { useOverview } from '../src/hooks';
import { formatMoney } from '../src/lib/currency';
import { today } from '../src/lib/dates';
import { logoOf } from '../src/lib/logo';
import type { Usage } from '../src/lib/types';
import { afterSaving } from '../src/services/nudge';
import { maybeAskForReview } from '../src/services/review';
import { categoryOf, useStore } from '../src/store';
import { space, useTheme } from '../src/theme';

const OPTIONS: { value: Usage; label: string }[] = [
  { value: 'often', label: 'Often' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'never', label: 'Not at all' },
];

/** Monthly "still using it?" check-in. Answers feed the cancel suggestions in Insights. */
export default function CheckIn() {
  const t = useTheme();
  const router = useRouter();
  const o = useOverview();
  const setUsage = useStore((s) => s.setUsage);
  const completeCheckIn = useStore((s) => s.completeCheckIn);
  const month = today().slice(0, 7);
  const subs = o.active.filter((v) => v.monthly > 0 || v.sub.shareMode !== 'they_pay');
  const answered = subs.filter((v) => v.sub.usage?.[month]).length;

  const done = () => {
    completeCheckIn(month);
    // Anything not used at all is money the check-in just found.
    const unused = subs.filter((v) => v.sub.usage?.[month] === 'never').reduce((sum, v) => sum + v.monthly * 12, 0);
    if (unused > 0) afterSaving({ kind: 'found', yearly: unused });
    else if (answered > 0) maybeAskForReview();
    router.canGoBack() ? router.back() : router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: space.md, paddingBottom: 64 }]}>
        <T muted style={{ marginBottom: space.md }}>
          How much have you used each of these over the last month? Anything you didn't use shows up in Insights as worth cancelling.
        </T>
        {subs.map(({ sub, monthly }) => (
          <View key={sub.id} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.border, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Avatar name={sub.name} color={sub.color ?? categoryOf(o.categories, sub.categoryId).color} size={32} logo={logoOf(sub)} />
              <T v="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                {sub.name}
              </T>
              <T v="small" muted>
                {formatMoney(monthly, o.base)}/mo
              </T>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={sub.usage?.[month] === opt.value}
                  onPress={() => setUsage(sub.id, month, sub.usage?.[month] === opt.value ? null : opt.value)}
                />
              ))}
            </View>
          </View>
        ))}
        <Button label={answered === subs.length ? 'Done' : `Done (${answered} of ${subs.length} answered)`} onPress={done} style={{ marginTop: space.xl }} />
      </ScrollView>
    </View>
  );
}
