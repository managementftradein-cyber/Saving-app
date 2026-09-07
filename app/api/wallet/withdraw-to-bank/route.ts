import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nairaToKobo } from "@/lib/format";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const bankAccountId = body?.bankAccountId;
  const amountNaira = Number(body?.amount);

  if (!bankAccountId || !amountNaira || amountNaira <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: bankAccount } = await supabase
    .from("bank_accounts")
    .select("paystack_recipient_code")
    .eq("id", bankAccountId)
    .eq("user_id", user.id)
    .single();

  if (!bankAccount) {
    return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
  }

  const amountKobo = nairaToKobo(amountNaira);

  // Step 1: reserve — deducts the wallet balance and creates a 'pending'
  // ledger row BEFORE any Paystack call. If anything below fails, this
  // reservation gets refunded — the balance never reflects money that's
  // both gone from the wallet and never sent.
  const { data: transactionId, error: reserveError } = await supabase.rpc(
    "reserve_withdrawal",
    { p_bank_account_id: bankAccountId, p_amount_kobo: amountKobo }
  );

  if (reserveError) {
    return NextResponse.json({ error: reserveError.message }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const transferRes = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: amountKobo,
        recipient: bankAccount.paystack_recipient_code,
        reason: "Nestegg withdrawal",
        reference: transactionId,
      }),
    });
    const transferData = await transferRes.json();

    const transferStatus = transferData?.data?.status;

    // "otp" means the Paystack account has OTP-for-transfers enabled,
    // which requires manual finalization on the BUSINESS's registered
    // phone — not something a customer-facing withdrawal flow can
    // complete. Treat it as a failure and tell the operator to disable it
    // (Paystack dashboard -> Settings -> Preferences -> Transfers).
    if (!transferRes.ok || !transferData?.status || transferStatus === "otp") {
      await admin.rpc("resolve_withdrawal", {
        p_transaction_id: transactionId,
        p_success: false,
      });
      const message =
        transferStatus === "otp"
          ? "Transfers require OTP finalization on this Paystack account — disable that in Paystack settings to allow automated withdrawals."
          : transferData?.message ?? "Transfer could not be started.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    // Transfer accepted — Paystack processes it async. The webhook
    // (transfer.success / transfer.failed / transfer.reversed) is what
    // actually resolves this transaction to success or failed. We just
    // record Paystack's transfer_code for reference now.
    await admin
      .from("wallet_transactions")
      .update({ paystack_reference: transferData.data.transfer_code })
      .eq("id", transactionId);

    return NextResponse.json({ success: true, status: "pending" });
  } catch (err) {
    // Network failure or unexpected error talking to Paystack — refund
    // immediately rather than leave the withdrawal stuck pending forever.
    await admin.rpc("resolve_withdrawal", {
      p_transaction_id: transactionId,
      p_success: false,
    });
    console.error("Withdrawal transfer call failed:", err);
    return NextResponse.json(
      { error: "Could not reach the payment processor. Your funds have been returned." },
      { status: 502 }
    );
  }
}
