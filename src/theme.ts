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

export function useTheme(): Palette & { dark: boolean } {
  const system = useColorScheme();
  const pref = useStore((s) => s.settings.theme);
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  return { ...(isDark ? dark : light), dark: isDark };
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
