-- Nestegg onboarding hardening
-- Run after schema.sql, schema_savings_wallet.sql and schema_otp.sql.
-- Safe for an existing database: it only creates missing profile/wallet rows.

insert into public.profiles (id, full_name, phone)
select
  u.id,
  u.raw_user_meta_data ->> 'full_name',
  u.phone
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

insert into public.wallets (user_id, balance_kobo)
select p.id, 0
from public.profiles p
left join public.wallets w on w.user_id = p.id
where w.user_id is null;

-- Keep the signup trigger idempotent for future accounts.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.phone)
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone);

  insert into public.wallets (user_id, balance_kobo)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;


-- Prevent browser clients from changing verification/KYC system fields directly.
drop policy if exists "Users can update their own profile" on public.profiles;

create or replace function public.complete_onboarding(
  p_phone text default null,
  p_date_of_birth date default null,
  p_start_kyc boolean default false
) returns void as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_date_of_birth is not null and p_date_of_birth > current_date then
    raise exception 'Date of birth cannot be in the future';
  end if;

  update public.profiles
  set phone = nullif(trim(coalesce(p_phone, '')), ''),
      date_of_birth = p_date_of_birth,
      kyc_status = case when p_start_kyc then 'pending' else 'not_started' end,
      onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = v_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.complete_onboarding(text, date, boolean) to authenticated;
revoke execute on function public.complete_onboarding(text, date, boolean) from anon;
