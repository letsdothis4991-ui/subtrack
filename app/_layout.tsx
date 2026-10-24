import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { addReminderTapListener, ensurePermission, rescheduleReminders } from '../src/services/notifications';
import { useAutoSync } from '../src/services/sync';
import { refreshWidget } from '../src/widget';
import { widgetData } from '../src/widget/data';
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
    if (age <= RATES_MAX_AGE_MS) return;
    // Wait until startup has settled before the first network request.
    const id = setTimeout(refreshRates, 3000);
    return () => clearTimeout(id);
  }, []);

  // Keep scheduled reminders in sync with the data (debounced).
  useEffect(() => {
    const id = setTimeout(() => {
      // Archived (cancelled) subscriptions don't renew, so they get no reminders.
      rescheduleReminders(subscriptions.filter((s) => !s.endDate), settings, rates).catch(() => {});
    }, 800);
    return () => clearTimeout(id);
  }, [subscriptions, settings.reminderHour, settings.baseCurrency]);

  useEffect(() => addReminderTapListener((route) => router.push(route as never)), [router]);

  useAutoSync();

  // Reminders need notification permission (Android 13+). Ask once there's something to remind about.
  const wantsReminders = subscriptions.some((s) => !s.endDate && s.reminderDays != null);
  useEffect(() => {
    if (wantsReminders) ensurePermission(true).catch(() => {});
  }, [wantsReminders]);

  // Keep the home-screen widget current (Android only).
  const categories = useStore((s) => s.categories);
  useEffect(() => {
    if (Platform.OS === 'android') refreshWidget(widgetData({ subscriptions, settings, rates }));
  }, [subscriptions, settings, rates, categories]);

  return null;
}

export default function RootLayout() {
  const t = useTheme();
  const hydrated = useStore((s) => s.hydrated);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
            <Stack.Screen name="import" options={{ presentation: 'modal', title: 'Import from CSV' }} />
            <Stack.Screen name="check-in" options={{ presentation: 'modal', title: 'Monthly check-in' }} />
          </Stack>
        </>
      )}
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
