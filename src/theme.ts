import { useColorScheme } from 'react-native';
import { useStore } from './store';

const light = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F2EE',
  text: '#141414',
  textMuted: '#6E6E69',
  textFaint: '#A3A39D',
  border: '#E7E7E1',
  accent: '#2F6B5E',
  accentSoft: '#E3EEEA',
  onAccent: '#FFFFFF',
  danger: '#B4432F',
  dangerSoft: '#F6E4DF',
  warn: '#A87414',
  warnSoft: '#F6EDD9',
  track: '#ECECE6',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#111111',
  surface: '#1A1A19',
  surfaceAlt: '#222220',
  text: '#F1F1EC',
  textMuted: '#A2A29C',
  textFaint: '#6A6A65',
  border: '#2A2A28',
  accent: '#7FBFAE',
  accentSoft: '#1F302B',
  onAccent: '#0E1A17',
  danger: '#E58A76',
  dangerSoft: '#3A221D',
  warn: '#E0B35A',
  warnSoft: '#352A16',
  track: '#2A2A28',
};

/** Accent colour themes. Forest is free; the rest come with SubTrack Plus. */
export const ACCENTS = {
  forest: { name: 'Forest', light: '#2F6B5E', lightSoft: '#E3EEEA', dark: '#7FBFAE', darkSoft: '#1F302B' },
  ocean: { name: 'Ocean', light: '#2D5F8B', lightSoft: '#E2ECF5', dark: '#8AB6DF', darkSoft: '#1B2A38' },
  plum: { name: 'Plum', light: '#6B3F7A', lightSoft: '#F0E6F3', dark: '#C59BD3', darkSoft: '#2E2133' },
  sunset: { name: 'Sunset', light: '#B5552E', lightSoft: '#F7E7DF', dark: '#E8A07F', darkSoft: '#3A251C' },
  rose: { name: 'Rose', light: '#A83E5B', lightSoft: '#F6E3E8', dark: '#E39AAE', darkSoft: '#38202A' },
  graphite: { name: 'Graphite', light: '#3A3A38', lightSoft: '#ECECE8', dark: '#C9C9C3', darkSoft: '#2A2A28' },
} as const;

export type AccentId = keyof typeof ACCENTS;
export const FREE_ACCENT: AccentId = 'forest';

export function accentFor(id: string | undefined, plus: boolean): (typeof ACCENTS)[AccentId] {
  const key = (id && id in ACCENTS && (plus || id === FREE_ACCENT) ? id : FREE_ACCENT) as AccentId;
  return ACCENTS[key];
}

export function useTheme(): Palette & { dark: boolean } {
  const system = useColorScheme();
  const pref = useStore((s) => s.settings.theme);
  const accentId = useStore((s) => s.settings.accent);
  const plus = useStore((s) => s.settings.plus);
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  const a = accentFor(accentId, plus);
  const base = isDark ? dark : light;
  return {
    ...base,
    accent: isDark ? a.dark : a.light,
    accentSoft: isDark ? a.darkSoft : a.lightSoft,
    dark: isDark,
  };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };
export const font = {
  hero: { fontSize: 40, fontWeight: '600' as const, letterSpacing: -1.2 },
  h1: { fontSize: 26, fontWeight: '600' as const, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
};
