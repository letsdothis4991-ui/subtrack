import * as ImagePicker from 'expo-image-picker';
import type { Draft } from '../lib/importing';
import { today } from '../lib/dates';
import { supabase } from './supabase';

export interface PickedImage {
  uri: string;
  data: string;
  mediaType: string;
}

export async function pickScreenshot(): Promise<PickedImage | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
  const a = res.canceled ? null : res.assets[0];
  if (!a?.base64) return null;
  // Web returns a data URL in `uri`; take the type from it when mimeType is missing.
  const mediaType = a.mimeType ?? a.uri.match(/^data:(image\/[a-z]+);/)?.[1] ?? 'image/jpeg';
  return { uri: a.uri, data: a.base64, mediaType };
}

/** Sends a screenshot or text to the extract-subscriptions edge function (Claude) and returns drafts. */
export async function extractSubscriptions(input: { text?: string; image?: PickedImage }, baseCurrency: string): Promise<Draft[]> {
  if (!supabase) throw new Error('Smart add needs cloud features, which aren’t set up in this build.');
  const { data, error } = await supabase.functions.invoke('extract-subscriptions', {
    body: {
      text: input.text,
      image: input.image ? { data: input.image.data, mediaType: input.image.mediaType } : undefined,
      today: today(),
      baseCurrency,
    },
  });
  if (error) {
    // Edge function errors carry our JSON message in the response body.
    const ctx = (error as { context?: Response }).context;
    const body = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null;
    throw new Error(body?.error ?? error.message);
  }
  return (data?.subscriptions ?? []) as Draft[];
}
