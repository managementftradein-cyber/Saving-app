# Nestegg — Auth, Onboarding, Savings + Wallet

Real, running code for the app in the flowchart. Built with Next.js 15
(App Router) + Supabase + Paystack.

## What's here

```
app/
  page.tsx                      Splash screen
  auth/signup, auth/login, auth/verify    Sign up, log in, email OTP
  onboarding/profile/            Optional KYC step
  dashboard/
    page.tsx                    Home — real wallet balance + goal totals
    savings/                    List, create, and view savings goals
    wallet/                     Balance, add money (Paystack), transaction history
    wallet/callback/            Verifies a Paystack payment right after checkout
  api/
    paystack/initialize/        Starts a Paystack deposit
    paystack/webhook/           Verifies signature, credits wallet (source of truth)
    wallet/transfer-to-goal/    Moves money from wallet into a goal
    wallet/withdraw/            Moves money from a goal back into wallet
lib/
  supabase/client.ts, server.ts  Browser / server Supabase clients
  supabase/admin.ts              Service-role client (webhook + callback only)
  format.ts                      Kobo <-> naira helpers, currency formatting
supabase/
  schema.sql                     profiles table + RLS
  schema_savings_wallet.sql      wallets, savings_goals, wallet_transactions + RLS
```

## How money moves (important)

Every amount is stored in **kobo** (1 NGN = 100 kobo) to avoid float
rounding — the same unit Paystack's API uses.

Wallet balances and goal amounts are **never updated directly** by client
code. Three Postgres functions in `schema_savings_wallet.sql` are the only
way money moves:

- `credit_wallet` — called only by the service role (the Paystack webhook
  and the payment-callback page), never by a logged-in user's session.
  Idempotent on the Paystack reference, so a webhook retry or the callback
  page running right after the webhook never double-credits.
- `transfer_to_goal` / `withdraw_from_goal` — callable by the logged-in
  user, but use `auth.uid()` internally rather than trusting a client-passed
  user id, so no one can move funds on someone else's behalf.

Row Level Security on `wallets` and `savings_goals` grants **read-only**
access to authenticated users — there is deliberately no UPDATE policy, so
even a compromised or malicious client can't PATCH a balance directly
through the Supabase API. Only these functions (running with elevated
privileges) can.

## Setup

1. **Run the schema, in order.** In Supabase → SQL Editor:
   `supabase/schema.sql` → `supabase/schema_savings_wallet.sql` →
   `supabase/schema_otp.sql`.

2. **Turn OFF "Confirm email."** In Supabase → Authentication → Providers →
   Email, disable "Confirm email." Verification is now handled entirely by
   your own `otp_codes` table and the `/api/otp/*` routes — Supabase's
   built-in confirmation would otherwise also try to gate sign-in and
   conflict with this flow. `signUp()` now returns an active session
   immediately; the middleware separately checks `profiles.email_verified`
   before letting anyone into `/onboarding` or `/dashboard`.

3. **Get a Resend account** (resend.com) for sending the email code, and a
   **Termii account** (termii.com) for the SMS code — or swap `lib/sms.ts`
   for whichever gateway you prefer.

4. **Get a Paystack account.** paystack.com → Settings → API Keys &
   Webhooks. Copy the **test secret key** for development, and set the
   webhook URL to `https://yourdomain.com/api/paystack/webhook`.

5. **Copy env vars.**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in Supabase URL/anon key/service role key, `PAYSTACK_SECRET_KEY`,
   `RESEND_API_KEY` + `RESEND_FROM_EMAIL`, and `TERMII_API_KEY` +
   `TERMII_SENDER_ID`.

6. **Install and run.**
   ```bash
   npm install
   npm run dev
   ```

7. **Deploy.** Push to GitHub, Vercel picks it up from the repo root. Add
   all env vars in Vercel → Settings → Environment Variables.

## How verification works now

Sign up → account is created (session starts immediately since Supabase's
own confirmation is off) → `/api/otp/request` generates a code server-side
and emails it via Resend → `/auth/verify` calls `/api/otp/verify`, which
flips `profiles.email_verified` → middleware lets the user past
`/onboarding` and `/dashboard` only once that flag is true. Phone
verification works the same way, offered as an optional step inside
onboarding, sent via Termii.

## Testing a deposit

Paystack's test mode accepts card `4084 0840 8408 4081`, any future expiry,
any CVV, OTP `123456`. After checkout you'll land on
`/dashboard/wallet/callback`, which verifies the transaction and credits
your wallet immediately — the webhook then fires separately and is a safe
no-op since crediting is idempotent.

## Next slices

- **Community forum** — posts, comments, likes, leaderboard.
- **Admin panel** — user management, KYC approval queue, analytics.
- **Notifications** — deposit/withdrawal alerts, savings reminders.

Say the word and we'll build the next one the same way.

## Required Supabase privilege migration

If a server-side onboarding/profile request reports `42501 permission denied for table profiles` while the database says the current role is `service_role`, run:

`supabase/migration_service_role_profiles_grants.sql`

This grants the trusted `service_role` the minimum `profiles` table privileges required by the server-side onboarding route. It does not grant browser users direct write access and does not disable RLS.
