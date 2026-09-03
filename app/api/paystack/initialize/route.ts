import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nairaToKobo } from "@/lib/format";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const amountNaira = Number(body?.amount);

  if (!amountNaira || amountNaira < 100) {
    return NextResponse.json(
      { error: "Enter an amount of at least ₦100" },
      { status: 400 }
    );
  }

  const origin = request.nextUrl.origin;

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: nairaToKobo(amountNaira),
      currency: "NGN",
      callback_url: `${origin}/dashboard/wallet/callback`,
      metadata: { user_id: user.id },
    }),
  });

  const paystackData = await paystackRes.json();

  if (!paystackRes.ok || !paystackData?.status) {
    return NextResponse.json(
      { error: paystackData?.message ?? "Could not start payment" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    authorization_url: paystackData.data.authorization_url,
    reference: paystackData.data.reference,
  });
}
