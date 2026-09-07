import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Real KYC: resolves a BVN via Paystack, then confirms the person actually
 * owns it by checking the date of birth they enter against the DOB tied to
 * that BVN. This costs Paystack a small fee per call (₦10 as of writing,
 * with some free calls per month) — see their pricing before high volume.
 *
 * Rate-limited to 5 attempts per 24h per user, so this can't be used to
 * brute-force guess a date of birth against a BVN someone doesn't own.
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
  const dateOfBirth = body?.dateOfBirth; // expected as YYYY-MM-DD

  if (!bvn || !/^\d{11}$/.test(bvn)) {
    return NextResponse.json({ error: "Enter a valid 11-digit BVN." }, { status: 400 });
  }
  if (!dateOfBirth) {
    return NextResponse.json({ error: "Enter your date of birth." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: allowed } = await admin.rpc("check_kyc_attempt_allowed", { p_user_id: user.id });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many verification attempts. Try again in 24 hours, or contact support." },
      { status: 429 }
    );
  }

  const resolveRes = await fetch(`https://api.paystack.co/bank/resolve_bvn/${bvn}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const resolveData = await resolveRes.json();

  if (!resolveRes.ok || !resolveData?.status) {
    await admin.from("kyc_verification_attempts").insert({ user_id: user.id, matched: false });
    return NextResponse.json(
      { error: resolveData?.message ?? "Could not verify this BVN. Check the number and try again." },
      { status: 400 }
    );
  }

  // Paystack's response field names for this endpoint — confirm against
  // current docs if this ever needs updating, as third-party API shapes
  // can shift.
  const returnedDob: string | undefined =
    resolveData.data?.formatted_dob ?? resolveData.data?.dob;

  const normalizedReturnedDob = returnedDob ? new Date(returnedDob).toISOString().slice(0, 10) : null;
  const matched = normalizedReturnedDob === dateOfBirth;

  await admin.from("kyc_verification_attempts").insert({ user_id: user.id, matched });

  if (!matched) {
    return NextResponse.json(
      { error: "The date of birth doesn't match what's on record for this BVN." },
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
