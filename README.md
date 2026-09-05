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
   `supabase/schema_otp.sql` → `supabase/schema_community.sql` →
   `supabase/schema_admin.sql`. These now include the `GRANT` statements a
   fresh project needs — see the note below if you're patching an
   already-running project instead of starting clean.

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

## A gotcha worth knowing about

Tables created by running raw SQL in the Supabase SQL Editor do **not**
automatically get the table-level `GRANT`s that tables created through the
dashboard's Table Editor receive. RLS policies only control *which rows* a
role can see — the role still needs a base `GRANT` to touch the table at
all. Without it, Postgres rejects every query with `permission denied for
table X`, before RLS is ever evaluated. If you add a new table by hand
later, remember to also `grant select` (and `insert`/`update` as needed) to
`authenticated` — see `supabase/migration_grant_authenticated_privileges.sql`
for the pattern.

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

## What community forum adds

`supabase/schema_community.sql` — posts, comments, likes, groups, and a
weekly savings leaderboard view. Like/comment counts are kept accurate by
database triggers rather than app-level increments, so two people liking
the same post at once can't corrupt the count. RLS lets any signed-in user
read everything, but only the author of a post/comment can delete it, and
only the security-definer triggers can touch the like/comment counters —
matching the same pattern used everywhere else in this project.

```
app/dashboard/community/
  page.tsx              Feed — posts, group chips, weekly leaderboard
  new/                  Create a post, optionally to a group
  [postId]/             Post detail with comments
  group-chips.tsx        Join/leave a community group
  like-button.tsx         Optimistic like toggle
app/api/community/
  posts/                 Create a post
  posts/[postId]/like     Toggle a like
  posts/[postId]/comments Add a comment
  groups/[groupId]/join   Toggle group membership
```

## What the admin panel adds

`supabase/schema_admin.sql` — adds a `role` column to `profiles`
(`'user'` or `'admin'`), settable **only** via a manual `UPDATE` in the SQL
editor — there's no signup flow, API route, or UI button that can ever
grant it. Admin routes check the caller's own role via their normal
session (`lib/admin-auth.ts`), then do the actual privileged read/write
through the service-role client — rather than adding RLS policies that
would let any authenticated session query everyone's rows directly.

```
app/admin/
  page.tsx               Overview — user counts, KYC queue, totals under management
  users/                 Full user list, filterable by pending KYC
  users/[userId]/         Profile detail + approve/reject KYC
  community/              Moderation — delete any post
app/api/admin/
  users/[userId]/kyc/     Approve/reject a user's KYC
  community/posts/[id]/   Admin delete for any post
lib/admin-auth.ts          Shared requireAdminUser() check
```

**To make yourself an admin**, after running `schema_admin.sql`, run in the
SQL editor:
```sql
update public.profiles set role = 'admin' where id = '<your-user-uuid>';
```
Find your ID with the query in the comments at the bottom of that file.
Then visit `/admin` — ordinary users get redirected straight back to
`/dashboard` if they try.

## Next slices

- **Notifications** — deposit/withdrawal alerts, savings reminders.

Say the word and we'll build it the same way.

## Required Supabase privilege migration

If a server-side onboarding/profile request reports `42501 permission denied for table profiles` while the database says the current role is `service_role`, run:

`supabase/migration_service_role_profiles_grants.sql`

This grants the trusted `service_role` the minimum `profiles` table privileges required by the server-side onboarding route. It does not grant browser users direct write access and does not disable RLS.
