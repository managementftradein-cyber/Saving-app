-- Nestegg: Real KYC via BVN verification
-- Run this AFTER all previous schema files.
--
-- This replaces the self-attested "tap a button, wait for admin" KYC path
-- with actual BVN verification against Paystack's identity API. The admin
-- approve/reject flow (schema_admin.sql) stays as a manual override for
-- edge cases, but BVN + DOB match is now the primary path and verifies
-- instantly rather than waiting on a human.
--
-- Safeguard: until kyc_status = 'verified', a wallet's balance is capped
-- (see get_deposit_cap_kobo below) — a rough analogue of the CBN's tiered
-- KYC framework, where an unverified account can hold and transact a
-- limited amount rather than an unlimited one.

alter table public.profiles
  add column if not exists bvn_verified boolean not null default false;

-- 1. Rate-limit BVN verification attempts ------------------------------------
-- Without this, someone could brute-force guess a date of birth against a
-- BVN they don't own by repeatedly submitting DOB guesses. Same pattern as
-- OTP rate limiting: a handful of attempts, then a cooldown.
create table if not exists public.kyc_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  matched boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists kyc_attempts_user_idx on public.kyc_verification_attempts (user_id, created_at desc);

create or replace function public.check_kyc_attempt_allowed(p_user_id uuid)
returns boolean as $$
declare
  v_recent_count int;
begin
  select count(*) into v_recent_count
    from public.kyc_verification_attempts
    where user_id = p_user_id and created_at > now() - interval '24 hours';

  return v_recent_count < 5;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.check_kyc_attempt_allowed(uuid) to service_role;

-- 2. Deposit cap for unverified accounts ---------------------------------------
create or replace function public.get_deposit_cap_kobo(p_user_id uuid)
returns bigint as $$
declare
  v_status text;
begin
  select kyc_status into v_status from public.profiles where id = p_user_id;

  if v_status = 'verified' then
    return null; -- no cap
  end if;

  return 5000000; -- NGN 50,000 total wallet balance ceiling, unverified tier
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.get_deposit_cap_kobo(uuid) to authenticated, service_role;

-- 3. RLS + grants ----------------------------------------------------------
alter table public.kyc_verification_attempts enable row level security;
-- No policies at all — this table is only ever touched by the
-- security-definer function and the service-role API route, never
-- directly by a client. Same pattern as otp_codes.

grant select, insert on table public.kyc_verification_attempts to service_role;
