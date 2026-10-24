import type { Subscription } from './types';

export function shareSummary(s: Subscription): string {
  const names = s.sharedWith ?? [];
  const who = names.length === 0 ? '' : names.length <= 2 ? names.join(' & ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  switch (s.shareMode) {
    case 'they_pay':
      return who ? `${who} pays · you're a member` : 'Paid by someone else';
    case 'i_pay':
      return `You pay for ${who || 'everyone'}`;
    default:
      return `Split ${names.length + 1} ways with ${who}`;
  }
}
