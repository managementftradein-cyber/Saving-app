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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, bankAccountId: data.id });
}
