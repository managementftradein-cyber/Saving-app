-- Nestegg: repair OTP verification/profile synchronization.
-- Run after schema.sql + schema_otp.sql. Safe to run more than once.

alter table public.profiles
  add column if not exists email_verified boolean not null default false,
  add column if not exists phone_verified boolean not null default false;

create or replace function public.verify_otp(
  p_destination text,
  p_purpose text,
  p_code text
) returns table(success boolean, user_id uuid, message text) as $$
declare
  v_row public.otp_codes%rowtype;
begin
  select * into v_row
    from public.otp_codes
    where destination = p_destination
      and purpose = p_purpose
      and consumed_at is null
    order by created_at desc
    limit 1
    for update;

  if v_row.id is null then
    return query select false, null::uuid, 'No active code — request a new one.';
    return;
  end if;

  if v_row.expires_at < now() then
    return query select false, null::uuid, 'That code has expired — request a new one.';
    return;
  end if;

  if v_row.attempts >= v_row.max_attempts then
    return query select false, null::uuid, 'Too many attempts — request a new code.';
    return;
  end if;

  if extensions.crypt(p_code, v_row.code_hash) <> v_row.code_hash then
    update public.otp_codes set attempts = attempts + 1 where id = v_row.id;
    return query select false, null::uuid, 'Incorrect code.';
    return;
  end if;

  update public.otp_codes set consumed_at = now() where id = v_row.id;

  if v_row.channel = 'email' then
    insert into public.profiles (id, email_verified)
    values (v_row.user_id, true)
    on conflict (id) do update set email_verified = true;
  elsif v_row.channel = 'phone' then
    insert into public.profiles (id, phone_verified)
    values (v_row.user_id, true)
    on conflict (id) do update set phone_verified = true;
  end if;

  return query select true, v_row.user_id, 'Verified.';
end;
$$ language plpgsql security definer set search_path = public, extensions;

grant execute on function public.verify_otp(text, text, text) to service_role;
revoke execute on function public.verify_otp(text, text, text) from authenticated, anon;
