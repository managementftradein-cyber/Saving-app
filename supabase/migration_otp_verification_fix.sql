-- Nestegg OTP verification hardening
-- Run after schema.sql + schema_otp.sql.
-- Fixes the case where verify_otp returns success but the profiles row
-- does not exist, causing middleware to send the user straight back to /auth/verify.

create or replace function public.verify_otp(
  p_destination text,
  p_purpose text,
  p_code text
) returns table(success boolean, user_id uuid, message text) as $$
declare
  v_row public.otp_codes%rowtype;
  v_profile_user public.profiles.id%type;
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

  -- Ensure the profile exists. This protects against a failed/missing
  -- auth.users -> profiles trigger during signup.
  insert into public.profiles (id, full_name, phone)
  select u.id, u.raw_user_meta_data ->> 'full_name', u.phone
  from auth.users u
  where u.id = v_row.user_id
  on conflict (id) do nothing;

  if v_row.channel = 'email' then
    update public.profiles set email_verified = true where id = v_row.user_id;
  elsif v_row.channel = 'phone' then
    update public.profiles set phone_verified = true where id = v_row.user_id;
  end if;

  select id into v_profile_user
    from public.profiles
    where id = v_row.user_id
      and (
        (v_row.channel = 'email' and email_verified = true)
        or (v_row.channel = 'phone' and phone_verified = true)
      );

  if v_profile_user is null then
    return query select false, null::uuid, 'Verification could not activate your profile. Please try again.';
    return;
  end if;

  return query select true, v_row.user_id, 'Verified.';
end;
$$ language plpgsql security definer set search_path = public, extensions, auth;

grant execute on function public.verify_otp(text, text, text) to service_role;
revoke execute on function public.verify_otp(text, text, text) from authenticated, anon;
