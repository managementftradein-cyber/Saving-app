-- Nestegg: repair authentication -> verification -> onboarding -> dashboard.
-- Run after schema.sql, schema_savings_wallet.sql and schema_otp.sql.

-- 1. Make verification flags available on existing installations.
alter table public.profiles
  add column if not exists email_verified boolean not null default false,
  add column if not exists phone_verified boolean not null default false;

-- 2. Repair missing profiles/wallets for existing Auth users.
insert into public.profiles (id, full_name, phone)
select u.id, u.raw_user_meta_data ->> 'full_name', u.phone
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

insert into public.wallets (user_id, balance_kobo)
select p.id, 0
from public.profiles p
left join public.wallets w on w.user_id = p.id
where w.user_id is null
on conflict (user_id) do nothing;

-- 3. Ensure the Auth trigger remains idempotent and creates both rows.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.phone)
  on conflict (id) do update
    set full_name = coalesce(public.profiles.full_name, excluded.full_name),
        phone = coalesce(public.profiles.phone, excluded.phone);

  insert into public.wallets (user_id, balance_kobo)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 4. Verification endpoint is responsible for setting email_verified. This
-- helper makes that operation explicit and guarantees the profile exists.
create or replace function public.mark_email_verified(p_user_id uuid)
returns void as $$
begin
  insert into public.profiles (id, email_verified)
  values (p_user_id, true)
  on conflict (id) do update set email_verified = true;

  insert into public.wallets (user_id, balance_kobo)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.mark_email_verified(uuid) to service_role;
revoke execute on function public.mark_email_verified(uuid) from anon, authenticated;
