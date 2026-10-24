import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, addMonths, parseISO, today } from '../lib/dates';
import { billingDates } from '../lib/calc';
import { convert, formatMoney } from '../lib/currency';
import type { Rates, Settings, Subscription } from '../lib/types';

// High importance so reminders pop up on screen (heads-up). Android can't raise an existing
// channel's importance, so this replaces the original 'renewals' channel.
const CHANNEL = 'renewal-alerts';
const OLD_CHANNELS = ['renewals'];
// Android caps pending alarms per app; stay well under it.
const MAX_SCHEDULED = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationsSupported = true;

export async function ensurePermission(ask: boolean): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Renewal reminders',
      description: 'Pops up before a subscription renews so you can cancel in time',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    });
    for (const id of OLD_CHANNELS) await Notifications.deleteNotificationChannelAsync(id).catch(() => {});
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !ask) return current.granted;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

/**
 * Replaces all scheduled reminders with fresh ones for the next ~4 months.
 * Called whenever subscriptions or settings change and on every app start,
 * so reminders keep rolling forward as long as the app is opened occasionally.
 */
export async function rescheduleReminders(subs: Subscription[], settings: Settings, rates: Rates): Promise<void> {
  if (!(await ensurePermission(false))) return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  const t = today();
  const pending: { at: Date; sub: Subscription; renewal: string }[] = [];
  for (const s of subs) {
    if (s.reminderDays == null) continue;
    for (const renewal of billingDates(s, t, addDays(t, 120))) {
      const at = parseISO(addDays(renewal, -s.reminderDays));
      at.setHours(settings.reminderHour, 0, 0, 0);
      if (at.getTime() > now) pending.push({ at, sub: s, renewal });
    }
  }
  pending.sort((a, b) => a.at.getTime() - b.at.getTime());

  // Monthly check-in nudge on the 1st of the next two months.
  if (subs.length > 0) {
    for (const k of [1, 2]) {
      const at = parseISO(addMonths(t.slice(0, 7) + '-01', k));
      at.setHours(settings.reminderHour, 0, 0, 0);
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Monthly check-in', body: 'Still using all your subscriptions? Take 30 seconds to spot what to cancel.', data: { route: '/check-in' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
    }
  }

  for (const { at, sub, renewal } of pending.slice(0, MAX_SCHEDULED - 2)) {
    const days = sub.reminderDays ?? 0;
    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
    const price = formatMoney(sub.amount, sub.currency);
    const inBase =
      sub.currency === settings.baseCurrency ? '' : ` (≈ ${formatMoney(convert(sub.amount, sub.currency, settings.baseCurrency, rates), settings.baseCurrency)})`;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: sub.isTrial ? `${sub.name} trial ends ${when}` : `${sub.name} renews ${when}`,
        body: `${price}${inBase}. Still using it? Tap to review or cancel.`,
        data: { subscriptionId: sub.id, renewal },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}

/** Route to open when a reminder is tapped. */
export function addReminderTapListener(onOpen: (route: string) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const data = r.notification.request.content.data ?? {};
    if (typeof data.route === 'string') onOpen(data.route);
    else if (typeof data.subscriptionId === 'string') onOpen(`/subscription/${data.subscriptionId}`);
  });
  return () => sub.remove();
}

/** Sends a sample reminder in a few seconds, so users can check pop-ups work on their phone. */
export async function sendTestReminder(): Promise<boolean> {
  if (!(await ensurePermission(true))) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Netflix renews in 3 days', body: 'This is a test reminder from SubTrack. Tap to open the app.', data: {} },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL },
  });
  return true;
}
