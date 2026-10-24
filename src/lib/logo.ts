import { LOGO_PATHS } from './logos.generated';
import { PRESETS } from './presets';

const byName = new Map(PRESETS.filter((p) => p.logo).map((p) => [p.name.toLowerCase(), p.logo!]));

/** Logo slug for a subscription: its own, or a preset whose name matches. */
export function logoOf(s: { logo?: string | null; name: string }): string | null {
  const slug = s.logo ?? byName.get(s.name.trim().toLowerCase()) ?? null;
  return slug && LOGO_PATHS[slug] ? slug : null;
}
