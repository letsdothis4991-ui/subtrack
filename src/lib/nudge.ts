/**
 * When to offer SubTrack Plus after a "found savings" moment (cancelling something, or a
 * check-in that turns up something unused). Kept rare so it never feels like nagging.
 */
export interface NudgeState {
  firstOpen: number;
  /** How many times the prompt has been shown. */
  shown: number;
  lastShown: number | null;
}

export const NUDGE_MAX_SHOWS = 3;
export const NUDGE_MIN_DAYS_INSTALLED = 2;
export const NUDGE_MIN_DAYS_BETWEEN = 30;
const DAY = 86_400_000;

export function canNudge(st: NudgeState, now: number): boolean {
  if (st.shown >= NUDGE_MAX_SHOWS) return false;
  if (now - st.firstOpen < NUDGE_MIN_DAYS_INSTALLED * DAY) return false;
  if (st.lastShown != null && now - st.lastShown < NUDGE_MIN_DAYS_BETWEEN * DAY) return false;
  return true;
}
