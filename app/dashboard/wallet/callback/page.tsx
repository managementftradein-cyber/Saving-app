import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKobo } from "@/lib/format";

export default async function PaystackCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  let status: "success" | "failed" | "missing" = "missing";
  let creditedKobo = 0;

  if (reference) {
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        cache: "no-store",
      }
    );
    const verifyData = await verifyRes.json();

    if (verifyRes.ok && verifyData?.data?.status === "success") {
      status = "success";
      creditedKobo = verifyData.data.amount;

      // Idempotent — if the webhook already credited this reference,
      // credit_wallet() is a no-op the second time.
      const admin = createAdminClient();
      await admin.rpc("credit_wallet", {
        p_user_id: user.id,
        p_amount_kobo: creditedKobo,
        p_reference: reference,
        p_description: "Wallet deposit via Paystack",
      });
    } else {
      status = "failed";
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center max-w-sm mx-auto">
      {status === "success" && (
        <>
          <div className="w-14 h-14 rounded-full bg-[#E9F8F0] flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B9C63" strokeWidth="2.4">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="font-display font-extrabold text-xl text-navy">
            {formatKobo(creditedKobo)} added
          </h1>
          <p className="text-sm text-ink-soft mt-2">
            Your wallet balance has been updated.
          </p>
        </>
      )}

      {status === "failed" && (
        <>
          <div className="w-14 h-14 rounded-full bg-[#FCECEB] flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C5453A" strokeWidth="2.4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
          <h1 className="font-display font-extrabold text-xl text-navy">
            Payment didn&apos;t go through
          </h1>
          <p className="text-sm text-ink-soft mt-2">
            No funds were added. You can try again from your wallet.
          </p>
        </>
      )}

      {status === "missing" && (
        <p className="text-sm text-ink-soft">Missing payment reference.</p>
      )}

      <Link href="/dashboard/wallet" className="btn-primary mt-8 w-full">
        Back to wallet
      </Link>
    </main>
  );
}
