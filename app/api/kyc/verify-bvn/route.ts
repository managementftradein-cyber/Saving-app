import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Real KYC via Paystack's BVN Match endpoint (POST /bvn/match). Paystack
 * deprecated the older resolve_bvn lookup — this current endpoint doesn't
 * return raw personal data at all; it takes a BVN plus a bank account
 * already tied to it, and returns true/false for whether the name and
 * account actually match. That's why this route requires a linked bank
 * account (see /dashboard/wallet/bank-accounts) rather than a typed date
 * of birth.
 *
 * Costs ₦15/call as of writing, with 10 free calls per month — check
 * current Paystack pricing before high volume.
 *
 * Rate-limited to 5 attempts per 24h per user, so this can't be used to
 * brute-force guess whose BVN belongs to a given bank account.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const bvn = body?.bvn?.trim();
  const bankAccountId = body?.bankAccountId;

  if (!bvn || !/^\d{11}$/.test(bvn)) {
    return NextResponse.json({ error: "Enter a valid 11-digit BVN." }, { status: 400 });
  }
  if (!bankAccountId) {
    return NextResponse.json(
      { error: "Select a linked bank account to verify against." },
      { status: 400 }
    );
  }

  const [{ data: bankAccount }, { data: profile }] = await Promise.all([
    supabase
      .from("bank_accounts")
      .select("account_number, bank_code")
      .eq("id", bankAccountId)
      .eq("user_id", user.id)
      .single(),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  if (!bankAccount) {
    return NextResponse.json({ error: "Bank account not found." }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: allowed } = await admin.rpc("check_kyc_attempt_allowed", { p_user_id: user.id });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many verification attempts. Try again in 24 hours, or contact support." },
      { status: 429 }
    );
  }

  const [firstName, ...rest] = (profile?.full_name ?? "").trim().split(" ");
  const lastName = rest.join(" ");

  const matchRes = await fetch("https://api.paystack.co/bvn/match", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bvn,
      account_number: bankAccount.account_number,
      bank_code: bankAccount.bank_code,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
    }),
  });
  const matchData = await matchRes.json();

  if (!matchRes.ok || !matchData?.status) {
    await admin.from("kyc_verification_attempts").insert({ user_id: user.id, matched: false });
    return NextResponse.json(
      { error: matchData?.message ?? "Could not verify this BVN. Check the number and try again." },
      { status: 400 }
    );
  }

  const result = matchData.data;

  // A blacklisted BVN is a serious compliance signal, not just "no
  // match" — reject outright and leave it for manual admin review rather
  // than silently treating it the same as a typo.
  if (result.is_blacklisted) {
    await admin.from("kyc_verification_attempts").insert({ user_id: user.id, matched: false });
    await admin.from("profiles").update({ kyc_status: "rejected" }).eq("id", user.id);
    return NextResponse.json(
      { error: "This BVN could not be verified. Contact support for help." },
      { status: 400 }
    );
  }

  // account_number must match — it's the only field tying the BVN to
  // THIS person's bank account. Name matches are supporting evidence but
  // Paystack does partial/fuzzy comparison on names, so don't hard-require
  // both if account_number already confirms ownership.
  const matched = result.account_number === true;

  await admin.from("kyc_verification_attempts").insert({ user_id: user.id, matched });

  if (!matched) {
    return NextResponse.json(
      { error: "This BVN doesn't match the linked bank account. Double check the number." },
      { status: 400 }
    );
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      kyc_status: "verified",
      bvn_verified: true,
      bvn_last4: bvn.slice(-4),
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
