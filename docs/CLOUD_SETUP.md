# Cloud setup: sync and smart add (≈20 minutes)

Sync and smart add run on **Supabase** (free tier is plenty to start) and the **Claude API**. Without this setup the app still works fully offline; the Sync section and smart add's screenshot/email modes are simply hidden (CSV import still works).

## 1. Create the Supabase project
1. Sign up at https://supabase.com → **New project**. Pick a region near your users and save the database password somewhere safe.
2. **Project Settings → API**: copy the **Project URL** and the **anon public** key.

## 2. Create the database table
**SQL Editor → New query** → paste the contents of `supabase/migrations/0001_init.sql` → **Run**.

## 3. Email sign-in (6-digit code)
1. **Authentication → Providers → Email**: enabled (default).
2. **Authentication → Email Templates → Magic Link**: make the email show the code. Replace the body with:
   ```html
   <h2>Your SubTrack code</h2>
   <p>Enter this code in the app: <strong style="font-size:24px">{{ .Token }}</strong></p>
   ```
3. Supabase's built-in email sender is rate-limited (a few per hour). Before launch, add your own SMTP under **Authentication → SMTP Settings** (Resend, Postmark, Amazon SES and others have free tiers).

## 4. Google sign-in on the web (optional)
**Authentication → Providers → Google**: follow the on-screen steps to create a Google OAuth client, then add your web app URL (`https://<user>.github.io/<repo>/`) under **Authentication → URL Configuration → Redirect URLs**.

## 5. Deploy the server functions
Install the CLI (https://supabase.com/docs/guides/cli), then from the project folder:
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set ANTHROPIC_API_KEY=<your Claude API key>
supabase functions deploy extract-subscriptions
supabase functions deploy delete-account
```
Get a Claude API key at https://console.anthropic.com (add a payment method and set a monthly spend limit). Smart add uses Claude Opus 5.5 at low effort; one screenshot is typically a fraction of a cent to a couple of cents. Each user is capped at 50 requests per 30 days (`MONTHLY_LIMIT` in the function).

## 6. Give the app the keys
GitHub → your repo → **Settings → Secrets and variables → Actions → New repository secret**:
- `EXPO_PUBLIC_SUPABASE_URL`: the Project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: the anon public key (safe to ship in the app; row-level security protects the data)

For local development, put the same two lines in a `.env.local` file (it's git-ignored).

## Known limitation
The Plus flag that unlocks smart add on the server comes from the user's synced settings, which the app writes after a Google Play purchase. That's fine to launch with, but a determined user could fake it. To harden it later, verify purchase tokens server-side with the Google Play Developer API.
