import AsyncStorage from '@react-native-async-storage/async-storage';
import { createElement } from 'react';
import { registerWidgetTaskHandler, requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { normaliseSubscription } from '../lib/sync';
import { widgetData, type WidgetData } from './data';
import { SummaryWidget } from './SummaryWidget';

export const WIDGET_NAME = 'Summary';

async function loadData(): Promise<WidgetData | null> {
  // Same key as the zustand persist store.
  const raw = await AsyncStorage.getItem('subtrack-v1');
  if (!raw) return null;
  const { state } = JSON.parse(raw);
  if (!state?.subscriptions?.length) return null;
  return widgetData({ ...state, subscriptions: state.subscriptions.map(normaliseSubscription) });
}

async function handler({ widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;
  renderWidget(createElement(SummaryWidget, { data: await loadData() }));
}

registerWidgetTaskHandler(handler);

/** Re-renders any placed widgets; call after data changes. */
export function refreshWidget(data: WidgetData) {
  requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => createElement(SummaryWidget, { data }) }).catch(() => {});
}
