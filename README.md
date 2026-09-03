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

1. **Run the schema.** In Supabase → SQL Editor, run `supabase/schema.sql`
   first (if you haven't already), then `supabase/schema_savings_wallet.sql`.

2. **Get a Paystack account.** paystack.com → Settings → API Keys &
   Webhooks. Copy the **test secret key** for development.

3. **Set the webhook URL.** In the same Paystack settings page, set the
   webhook URL to `https://yourdomain.com/api/paystack/webhook` (must be a
   public HTTPS URL — use a tool like ngrok while testing locally).

4. **Copy env vars.**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in the Supabase URL/anon key (Project Settings → API), the
   **service role key** (same page, `service_role` secret — never expose
   this to the browser), and `PAYSTACK_SECRET_KEY`.

5. **Install and run.**
   ```bash
   npm install
   npm run dev
   ```

6. **Deploy.** Push to GitHub, Vercel picks it up from the repo root. Add
   all four env vars in Vercel → Settings → Environment Variables, then
   update the Paystack webhook URL to your production domain.

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
