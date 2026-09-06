import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Paystack webhook. Handles two independent flows:
 *
 * 1. charge.success — deposits. Source of truth for crediting a wallet;
 *    the /dashboard/wallet/callback page also verifies and credits so the
 *    UI updates immediately, but credit_wallet() is idempotent on the
 *    Paystack reference, so whichever path runs first "wins".
 *
 * 2. transfer.success / transfer.failed / transfer.reversed — bank
 *    withdrawals. This is the ONLY place a withdrawal actually gets
 *    confirmed as sent — the initiate-transfer API call only starts it.
 *    Matched by transaction id, since that's what was passed as Paystack's
 *    `reference` when the transfer was initiated (see
 *    /api/wallet/withdraw-to-bank).
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
  const admin = createAdminClient();

  if (event.event === "charge.success") {
    const { reference, amount, metadata } = event.data;
    const userId = metadata?.user_id;

    if (userId) {
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

  if (
    event.event === "transfer.success" ||
    event.event === "transfer.failed" ||
    event.event === "transfer.reversed"
  ) {
    const transactionId = event.data.reference;
    const succeeded = event.event === "transfer.success";

    const { error } = await admin.rpc("resolve_withdrawal", {
      p_transaction_id: transactionId,
      p_success: succeeded,
      p_paystack_reference: event.data.transfer_code ?? null,
    });

    if (error) {
      console.error("resolve_withdrawal failed:", error.message);
      return NextResponse.json({ error: "Resolve failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
