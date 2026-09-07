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
  const bankCode = body?.bankCode;
  const accountNumber = body?.accountNumber;

  if (!bankCode || !/^\d{10}$/.test(accountNumber ?? "")) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit account number and select a bank." },
      { status: 400 }
    );
  }

  const res = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );
  const data = await res.json();

  if (!res.ok || !data?.status) {
    return NextResponse.json(
      { error: data?.message ?? "Could not verify this account number." },
      { status: 400 }
    );
  }

  return NextResponse.json({ accountName: data.data.account_name });
}
