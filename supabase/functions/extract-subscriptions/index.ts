// Smart add: reads a pasted billing email or text and returns the subscriptions it mentions.
// Requires a signed-in SubTrack Plus user. Secrets: ANTHROPIC_API_KEY (set with `supabase secrets set`).
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { betaZodOutputFormat } from 'npm:@anthropic-ai/sdk@1.3.0/helpers/beta/zod';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { z } from 'npm:zod@4.6.7';
import { cors, json } from '../_shared/cors.ts';

const MONTHLY_LIMIT = 50;
const MAX_TEXT = 60_000;

const Extracted = z.object({
  subscriptions: z.array(
    z.object({
      name: z.string().describe('Service name as people know it, e.g. "Netflix", "Spotify Premium"'),
      amount: z.number().describe('Price per billing period, as a number'),
      currency: z.string().describe('ISO 4217 code, e.g. USD, GBP, EUR'),
      cycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
      interval: z.number().int().describe('Bill every N cycles; 1 unless stated otherwise'),
      nextRenewal: z.string().nullable().describe('Next charge or trial end date as YYYY-MM-DD, or null if unknown'),
      isTrial: z.boolean().describe('True if this is a free trial that will convert to paid'),
      category: z.enum(['streaming', 'music', 'news', 'ai', 'software', 'cloud', 'utilities', 'gaming', 'fitness', 'other']),
    }),
  ),
});

const SYSTEM = `You extract recurring subscriptions from receipts, billing emails, bank statements and other pasted text.
Only include recurring charges (subscriptions, memberships, plans). Skip one-off purchases, refunds, and totals.
If the same subscription appears several times, return it once with the latest price and the next upcoming renewal.
Work out the next renewal from the last charge date and the billing cycle when it isn't stated; use null when you can't tell.
Use the currency shown; if no currency is visible, use the user's base currency.
Return an empty list when there are no subscriptions.`;

const anthropic = new Anthropic();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth } = await userClient.auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: 'Sign in to use smart add.' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Plus check against the user's synced settings.
  const { data: row } = await admin.from('user_data').select('doc').eq('user_id', user.id).maybeSingle();
  if (!row?.doc?.settings?.plus) return json({ error: 'Smart add is part of SubTrack Plus.' }, 402);

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { count } = await admin.from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('used_at', since);
  if ((count ?? 0) >= MONTHLY_LIMIT) return json({ error: `Smart add limit reached (${MONTHLY_LIMIT} per 30 days).` }, 429);

  let body: { text?: string; today?: string; baseCurrency?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const text = (body.text ?? '').slice(0, MAX_TEXT);
  if (!text.trim()) return json({ error: 'Paste some text first.' }, 400);

  const prompt = `Today is ${body.today ?? new Date().toISOString().slice(0, 10)}. My base currency is ${body.baseCurrency ?? 'USD'}.

<document>
${text}
</document>

List the subscriptions in this document.`;

  try {
    const response = await anthropic.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // If the model declines, the API retries on a suitable fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { effort: 'low', format: betaZodOutputFormat(Extracted) },
      messages: [{ role: 'user', content: prompt }],
    });
    await admin.from('ai_usage').insert({ user_id: user.id });
    if (response.stop_reason === 'refusal') return json({ error: "Couldn't read that one. Try pasting a different email." }, 422);
    return json({ subscriptions: response.parsed_output?.subscriptions ?? [] });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Busy right now. Try again in a minute.' }, 503);
    if (e instanceof Anthropic.APIError) return json({ error: `AI service error (${e.status})` }, 502);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
