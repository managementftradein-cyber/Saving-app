# Nestegg — Auth + Onboarding

Real, running code for the first slice of the savings app: sign up, email OTP
verification, optional KYC/profile step, and a dashboard shell. Built with
Next.js 15 (App Router) + Supabase, matching the flowchart and mockup.

## What's here

```
app/
  page.tsx                  Splash screen (Sign up / Log in)
  auth/signup/page.tsx       Sign up form → supabase.auth.signUp
  auth/login/page.tsx        Login form → supabase.auth.signInWithPassword
  auth/verify/page.tsx       6-digit email OTP → supabase.auth.verifyOtp
  onboarding/profile/        Optional KYC step (phone, DOB, start/skip KYC)
  dashboard/page.tsx         Protected dashboard shell, reads the real profile
lib/supabase/
  client.ts                  Browser Supabase client
  server.ts                  Server Component / Route Handler Supabase client
middleware.ts                 Protects /dashboard and /onboarding, refreshes sessions
supabase/schema.sql            profiles table + RLS + auto-create-on-signup trigger
components/sign-out-button.tsx
```

## Setup

1. **Create a Supabase project** at supabase.com (free tier is fine).

2. **Run the schema.** In your Supabase project → SQL Editor, paste and run
   the contents of `supabase/schema.sql`. This creates the `profiles` table,
   row-level security policies, and a trigger that creates a profile row the
   moment someone signs up.

3. **Turn on email OTP.** In Supabase → Authentication → Email Templates,
   the "Confirm signup" template uses `{{ .Token }}` by default, which is a
   6-digit OTP — no changes needed. If your template was customized to use a
   magic link instead, switch it back to the token/OTP variant so it matches
   the `verifyOtp` call in `app/auth/verify/page.tsx`.

4. **Copy env vars.**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   Supabase → Project Settings → API.

5. **Install and run.**
   ```bash
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000`.

6. **Deploy.** Push to GitHub, import into Vercel, add the same two env vars
   in Vercel → Settings → Environment Variables, deploy.

## Flow this covers

Splash → Sign Up → Verify Email (OTP) → Complete Profile (optional KYC) →
Home Dashboard, matching steps 1–4 of the flowchart's core user journey.

## Next slices

- **Savings + Wallet**: goals table, deposits/withdrawals, Paystack for
  Nigerian bank transfers and cards.
- **Community forum**: posts, comments, likes, leaderboard.
- **Admin panel**: user management, KYC approval queue, analytics.

Say the word and we'll build the next one the same way — real schema, real
RLS, real pages.
