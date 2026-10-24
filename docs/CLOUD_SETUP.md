# Cloud setup: sync (≈15 minutes)

Sync runs on **Supabase** (the free tier is plenty to start). Without this setup the app still works fully offline; the Sync section is simply hidden.

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

## 5. Deploy the account-deletion function
Install the CLI (https://supabase.com/docs/guides/cli), then from the project folder:
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy delete-account
```

## 6. Give the app the keys
GitHub → your repo → **Settings → Secrets and variables → Actions → New repository secret**:
- `EXPO_PUBLIC_SUPABASE_URL`: the Project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: the anon public key (safe to ship in the app; row-level security protects the data)

For local development, put the same two lines in a `.env.local` file (it's git-ignored).
