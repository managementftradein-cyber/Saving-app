import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { bankCode, bankName, accountNumber, accountName } = body ?? {};

  if (!bankCode || !bankName || !accountNumber || !accountName) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Idempotency check: if this exact account is already linked for this
  // user (e.g. a retried request after a slow response, or a duplicate
  // tap), just return the existing row instead of creating a second
  // Paystack recipient and hitting the unique constraint on
  // paystack_recipient_code — Paystack itself reuses the same recipient
  // for a repeat account_number + bank_code, so a second INSERT would
  // always collide.
  const { data: existing } = await supabase
    .from("bank_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("account_number", accountNumber)
    .eq("bank_code", bankCode)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true, bankAccountId: existing.id, alreadyLinked: true });
  }

  // Create the Paystack transfer recipient FIRST — if this fails, nothing
  // is saved locally, so there's never a bank_accounts row pointing at a
  // recipient that doesn't actually exist on Paystack's side.
  const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "nuban",
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    }),
  });
  const recipientData = await recipientRes.json();

  if (!recipientRes.ok || !recipientData?.status) {
    return NextResponse.json(
      { error: recipientData?.message ?? "Could not link this bank account." },
      { status: 502 }
    );
  }

  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      user_id: user.id,
      bank_name: bankName,
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName,
      paystack_recipient_code: recipientData.data.recipient_code,
    })
    .select("id")
    .single();

  if (error) {
    // Race condition fallback: two rapid duplicate requests could both
    // pass the existence check above before either commits. If the
    // insert fails specifically on the recipient-code constraint, treat
    // it the same as the idempotency check above rather than surfacing
    // a confusing raw database error.
    if (error.code === "23505") {
      const { data: retryExisting } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("account_number", accountNumber)
        .eq("bank_code", bankCode)
        .maybeSingle();

      if (retryExisting) {
        return NextResponse.json({
          success: true,
          bankAccountId: retryExisting.id,
          alreadyLinked: true,
        });
      }
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, bankAccountId: data.id });
}
