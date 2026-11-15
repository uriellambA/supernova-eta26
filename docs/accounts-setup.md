# Growvia accounts: setup (about 10 minutes)

Accounts are optional. Until these steps are done, the app works as before and the "Sign in" button stays hidden.

## 1. Create the project
1. Go to <https://supabase.com>, sign in and press **New project** (free plan).
2. Name it `growvia`, choose a database password (keep it, it is not needed by the app) and the region **South America (São Paulo)**.

## 2. Create the tables
1. In the project: **SQL Editor → New query**.
2. Paste the whole content of [`supabase/schema.sql`](../supabase/schema.sql) and press **Run**.
   It creates the `farms` and `saved_sessions` tables, with rules so each person only sees their own data,
   and the "delete my account" function.

## 3. E-mail sign-in with a code
1. **Authentication → Sign In / Providers → Email**: enabled (it is by default).
2. **Authentication → Emails → Magic Link**: replace the template with:

   ```html
   <h2>Your Growvia code</h2>
   <p>Type this code in Growvia: <strong style="font-size:24px">{{ .Token }}</strong></p>
   <p>Or open this link on this device: <a href="{{ .ConfirmationURL }}">sign in</a></p>
   ```

   The code is what makes sign-in work inside the desktop and Android apps.
3. **Authentication → URL Configuration**:
   - Site URL: `https://growvia-coral.vercel.app`
   - Redirect URLs: add `https://growvia-coral.vercel.app/account` and `http://localhost:3000/account`

The free plan sends only a few e-mails per hour. For the contest that is enough; for more, add your own SMTP
(**Authentication → Emails → SMTP settings**).

## 4. (Optional) Google
1. In Google Cloud Console create an OAuth client (type *Web application*) with the redirect URI that Supabase
   shows in **Authentication → Sign In / Providers → Google**.
2. Paste the client ID and secret there and enable Google.
   Google does not allow signing in inside app windows, so the apps show only the e-mail code.

## 5. Connect the app
1. In Supabase: **Project Settings → API**: copy the **Project URL** and the **anon public** key.
   (Both are public by design: the database rules from step 2 protect each person's data. Never use the
   `service_role` key in the app.)
2. In Vercel: **Project → Settings → Environment Variables**, add for Production and Preview:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon public key
3. **Redeploy** the latest deployment. The "Sign in" button appears on the dashboard and the register.
   The desktop and Android apps load the website, so they get it too, without a new release.

For local development put the same two lines in `.env.local`.
