import type { Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'streaming', name: 'Streaming', color: '#C2554A', budget: null },
  { id: 'music', name: 'Music & audio', color: '#D08B3E', budget: null },
  { id: 'news', name: 'News & reading', color: '#4F6D8F', budget: null },
  { id: 'ai', name: 'AI', color: '#7A5BA6', budget: null },
  { id: 'software', name: 'Software', color: '#2F6B5E', budget: null },
  { id: 'cloud', name: 'Cloud & storage', color: '#3B8BA5', budget: null },
  { id: 'utilities', name: 'Utilities', color: '#6B7A3A', budget: null },
  { id: 'gaming', name: 'Gaming', color: '#A54A7A', budget: null },
  { id: 'fitness', name: 'Health & fitness', color: '#4A9A6B', budget: null },
  { id: 'other', name: 'Other', color: '#8C8C86', budget: null },
];

/** Extra colours offered when creating categories. */
export const PALETTE = [
  '#C2554A', '#D08B3E', '#C9A93A', '#6B7A3A', '#4A9A6B', '#2F6B5E', '#3B8BA5',
  '#4F6D8F', '#5B5FA6', '#7A5BA6', '#A54A7A', '#8C6A55', '#8C8C86', '#3A3A38',
];

export interface ServicePreset {
  name: string;
  categoryId: string;
  color: string;
  manageUrl: string;
  /** simple-icons slug, when a logo is available. */
  logo?: string;
}

const APPLE_SUBS = 'https://apps.apple.com/account/subscriptions';
const PLAY_SUBS = 'https://play.google.com/store/account/subscriptions';
const MS_SERVICES = 'https://account.microsoft.com/services';

/**
 * Popular services with a "manage account" link, so adding one is a single tap.
 * Links point at each service's account or billing page; the user can edit them.
 */
export const PRESETS: ServicePreset[] = [
  { name: 'Netflix', categoryId: 'streaming', color: '#E50914', manageUrl: 'https://www.netflix.com/account', logo: 'netflix' },
  { name: 'Disney+', categoryId: 'streaming', color: '#113CCF', manageUrl: 'https://www.disneyplus.com/account' },
  { name: 'Prime Video', categoryId: 'streaming', color: '#00A8E1', manageUrl: 'https://www.amazon.com/gp/primecentral' },
  { name: 'Amazon Prime', categoryId: 'utilities', color: '#FF9900', manageUrl: 'https://www.amazon.com/gp/primecentral' },
  { name: 'YouTube Premium', categoryId: 'streaming', color: '#FF0000', manageUrl: 'https://www.youtube.com/paid_memberships', logo: 'youtube' },
  { name: 'Max', categoryId: 'streaming', color: '#002BE7', manageUrl: 'https://www.max.com/', logo: 'max' },
  { name: 'Hulu', categoryId: 'streaming', color: '#1CE783', manageUrl: 'https://secure.hulu.com/account' },
  { name: 'Paramount+', categoryId: 'streaming', color: '#0064FF', manageUrl: 'https://www.paramountplus.com/account/', logo: 'paramountplus' },
  { name: 'Peacock', categoryId: 'streaming', color: '#000000', manageUrl: 'https://www.peacocktv.com/account' },
  { name: 'Apple TV+', categoryId: 'streaming', color: '#111111', manageUrl: APPLE_SUBS , logo: 'appletv' },
  { name: 'Crunchyroll', categoryId: 'streaming', color: '#F47521', manageUrl: 'https://www.crunchyroll.com/account/membership', logo: 'crunchyroll' },
  { name: 'Spotify', categoryId: 'music', color: '#1DB954', manageUrl: 'https://www.spotify.com/account/overview/', logo: 'spotify' },
  { name: 'Apple Music', categoryId: 'music', color: '#FA243C', manageUrl: APPLE_SUBS , logo: 'applemusic' },
  { name: 'YouTube Music', categoryId: 'music', color: '#FF0000', manageUrl: 'https://www.youtube.com/paid_memberships', logo: 'youtubemusic' },
  { name: 'Audible', categoryId: 'music', color: '#F8991C', manageUrl: 'https://www.audible.com/account/overview', logo: 'audible' },
  { name: 'Kindle Unlimited', categoryId: 'news', color: '#232F3E', manageUrl: 'https://www.amazon.com/kindle-dbs/ku/ku-central' },
  { name: 'The New York Times', categoryId: 'news', color: '#111111', manageUrl: 'https://myaccount.nytimes.com/seg/subscription', logo: 'newyorktimes' },
  { name: 'The Wall Street Journal', categoryId: 'news', color: '#111111', manageUrl: 'https://customercenter.wsj.com/' },
  { name: 'The Economist', categoryId: 'news', color: '#E3120B', manageUrl: 'https://myaccount.economist.com/' },
  { name: 'The Guardian', categoryId: 'news', color: '#052962', manageUrl: 'https://manage.theguardian.com/', logo: 'theguardian' },
  { name: 'Medium', categoryId: 'news', color: '#111111', manageUrl: 'https://medium.com/me/settings/membership', logo: 'medium' },
  { name: 'Substack', categoryId: 'news', color: '#FF6719', manageUrl: 'https://substack.com/settings', logo: 'substack' },
  { name: 'ChatGPT Plus', categoryId: 'ai', color: '#10A37F', manageUrl: 'https://chatgpt.com/#settings/Subscription' },
  { name: 'Claude Pro', categoryId: 'ai', color: '#D97757', manageUrl: 'https://claude.ai/settings/billing', logo: 'claude' },
  { name: 'Google AI / Google One', categoryId: 'ai', color: '#4285F4', manageUrl: 'https://one.google.com/settings', logo: 'googlegemini' },
  { name: 'Perplexity Pro', categoryId: 'ai', color: '#20808D', manageUrl: 'https://www.perplexity.ai/settings/account', logo: 'perplexity' },
  { name: 'GitHub Copilot', categoryId: 'ai', color: '#24292F', manageUrl: 'https://github.com/settings/billing', logo: 'githubcopilot' },
  { name: 'Midjourney', categoryId: 'ai', color: '#111111', manageUrl: 'https://www.midjourney.com/account' },
  { name: 'Microsoft 365', categoryId: 'software', color: '#D83B01', manageUrl: MS_SERVICES },
  { name: 'Adobe Creative Cloud', categoryId: 'software', color: '#FA0F00', manageUrl: 'https://account.adobe.com/plans' },
  { name: 'Canva Pro', categoryId: 'software', color: '#00C4CC', manageUrl: 'https://www.canva.com/settings/billing-and-plans' },
  { name: '1Password', categoryId: 'software', color: '#0572EC', manageUrl: 'https://my.1password.com/', logo: '1password' },
  { name: 'NordVPN', categoryId: 'software', color: '#4687FF', manageUrl: 'https://my.nordaccount.com/', logo: 'nordvpn' },
  { name: 'Dropbox', categoryId: 'cloud', color: '#0061FF', manageUrl: 'https://www.dropbox.com/account/plan', logo: 'dropbox' },
  { name: 'iCloud+', categoryId: 'cloud', color: '#3693F3', manageUrl: APPLE_SUBS , logo: 'icloud' },
  { name: 'Google One', categoryId: 'cloud', color: '#4285F4', manageUrl: 'https://one.google.com/settings' },
  { name: 'Xbox Game Pass', categoryId: 'gaming', color: '#107C10', manageUrl: MS_SERVICES },
  { name: 'PlayStation Plus', categoryId: 'gaming', color: '#003791', manageUrl: 'https://www.playstation.com/acct/management', logo: 'playstation' },
  { name: 'Nintendo Switch Online', categoryId: 'gaming', color: '#E60012', manageUrl: 'https://accounts.nintendo.com/shop' },
  { name: 'Strava', categoryId: 'fitness', color: '#FC4C02', manageUrl: 'https://www.strava.com/account', logo: 'strava' },
  { name: 'Peloton', categoryId: 'fitness', color: '#111111', manageUrl: 'https://www.onepeloton.com/', logo: 'peloton' },
  { name: 'Headspace', categoryId: 'fitness', color: '#F47D31', manageUrl: 'https://www.headspace.com/', logo: 'headspace' },
  { name: 'Duolingo Super', categoryId: 'other', color: '#58CC02', manageUrl: 'https://www.duolingo.com/settings/account', logo: 'duolingo' },
  { name: 'Patreon', categoryId: 'other', color: '#FF424D', manageUrl: 'https://www.patreon.com/settings/memberships', logo: 'patreon' },
  { name: 'Google Play subscription', categoryId: 'other', color: '#01875F', manageUrl: PLAY_SUBS , logo: 'googleplay' },
];

/** Shown first in the first-run setup; the rest are a search away. */
export const POPULAR = [
  'Netflix', 'Spotify', 'YouTube Premium', 'Amazon Prime', 'Disney+', 'Max', 'Apple Music', 'ChatGPT Plus',
  'iCloud+', 'Google One', 'Microsoft 365', 'Xbox Game Pass', 'PlayStation Plus', 'Audible', 'Duolingo Super', 'Paramount+',
];
