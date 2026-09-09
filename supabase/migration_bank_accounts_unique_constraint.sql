-- Defense in depth alongside the idempotency check in
-- app/api/bank-accounts/route.ts: prevents the same account_number +
-- bank_code from ever being linked twice for the same user, even if a
-- future code change reintroduces a race condition.

alter table public.bank_accounts
  add constraint bank_accounts_user_account_unique
  unique (user_id, account_number, bank_code);
