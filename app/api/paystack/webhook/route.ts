import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Paystack webhook. This is the source of truth for crediting a wallet —
 * the /dashboard/wallet/callback page also verifies and credits so the UI
 * updates immediately, but credit_wallet() is idempotent on the Paystack
 * reference, so whichever path runs first "wins" and the other is a no-op.
 *
 * Configure this URL (https://yourdomain.com/api/paystack/webhook) in the
 * Paystack dashboard under Settings → API Keys & Webhooks.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  const expectedSignature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");

  if (!signature || signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const { reference, amount, metadata } = event.data;
    const userId = metadata?.user_id;

    if (userId) {
      const admin = createAdminClient();
      const { error } = await admin.rpc("credit_wallet", {
        p_user_id: userId,
        p_amount_kobo: amount,
        p_reference: reference,
        p_description: "Wallet deposit via Paystack",
      });

      if (error) {
        console.error("credit_wallet failed:", error.message);
        return NextResponse.json({ error: "Credit failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
