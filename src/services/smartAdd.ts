import type { Draft } from '../lib/importing';
import { today } from '../lib/dates';
import { supabase } from './supabase';

/** Sends pasted text (e.g. a billing email) to the extract-subscriptions edge function (Claude) and returns drafts. */
export async function extractSubscriptions(text: string, baseCurrency: string): Promise<Draft[]> {
  if (!supabase) throw new Error('Smart add needs cloud features, which aren’t set up in this build.');
  const { data, error } = await supabase.functions.invoke('extract-subscriptions', {
    body: { text, today: today(), baseCurrency },
  });
  if (error) {
    // Edge function errors carry our JSON message in the response body.
    const ctx = (error as { context?: Response }).context;
    const body = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null;
    throw new Error(body?.error ?? error.message);
  }
  return (data?.subscriptions ?? []) as Draft[];
}
