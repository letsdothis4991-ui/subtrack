import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { addReminderTapListener, rescheduleReminders } from '../src/services/notifications';
import { useStore } from '../src/store';
import { useTheme } from '../src/theme';

const RATES_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function Effects() {
  const router = useRouter();
  const subscriptions = useStore((s) => s.subscriptions);
  const settings = useStore((s) => s.settings);
  const rates = useStore((s) => s.rates);
  const refreshRates = useStore((s) => s.refreshRates);

  useEffect(() => {
    const age = rates.updatedAt ? Date.now() - new Date(rates.updatedAt).getTime() : Infinity;
    if (age > RATES_MAX_AGE_MS) refreshRates();
  }, []);

  // Keep scheduled reminders in sync with the data (debounced).
  useEffect(() => {
    const id = setTimeout(() => {
      rescheduleReminders(subscriptions, settings, rates).catch(() => {});
    }, 800);
    return () => clearTimeout(id);
  }, [subscriptions, settings.reminderHour, settings.baseCurrency]);

  useEffect(() => addReminderTapListener((id) => router.push(`/subscription/${id}`)), [router]);

  return null;
}

export default function RootLayout() {
  const t = useTheme();
  const hydrated = useStore((s) => s.hydrated);

  return (
    <SafeAreaProvider>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      {!hydrated ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : (
        <>
          <Effects />
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerStyle: { backgroundColor: t.bg },
              headerTintColor: t.text,
              headerTitleStyle: { fontWeight: '600' },
              contentStyle: { backgroundColor: t.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'SubTrack' }} />
            <Stack.Screen name="edit" options={{ presentation: 'modal', title: 'Subscription' }} />
            <Stack.Screen name="subscription/[id]" options={{ title: '' }} />
            <Stack.Screen name="categories" options={{ title: 'Categories' }} />
          </Stack>
        </>
      )}
    </SafeAreaProvider>
  );
}
