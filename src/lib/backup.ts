import type { Category, Settings, Subscription } from './types';

export interface BackupFile {
  app: 'subtrack';
  version: 1;
  exportedAt: string;
  subscriptions: Subscription[];
  categories: Category[];
  settings: Partial<Settings>;
}

export function makeBackup(subscriptions: Subscription[], categories: Category[], settings: Settings): BackupFile {
  // Purchases stay with the store account, not the backup.
  const { plus: _ignored, ...rest } = settings;
  return { app: 'subtrack', version: 1, exportedAt: new Date().toISOString(), subscriptions, categories, settings: rest };
}

export function parseBackup(text: string): BackupFile {
  const data = JSON.parse(text);
  if (data?.app !== 'subtrack' || !Array.isArray(data.subscriptions) || !Array.isArray(data.categories)) {
    throw new Error('This file is not a SubTrack backup.');
  }
  return data as BackupFile;
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCSV(subscriptions: Subscription[], categories: Category[]): string {
  const header = ['Name', 'Amount', 'Currency', 'Cycle', 'Every', 'Next/anchor date', 'Start', 'End', 'Category', 'Payment method', 'Manage URL', 'Shared with', 'Share mode', 'Notes'];
  const rows = subscriptions.map((s) => [
    s.name, s.amount, s.currency, s.cycle, s.interval, s.anchorDate, s.startDate, s.endDate ?? '',
    categories.find((c) => c.id === s.categoryId)?.name ?? '', s.paymentMethod, s.manageUrl, (s.sharedWith ?? []).join('; '), s.shareMode ?? '', s.notes,
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}
