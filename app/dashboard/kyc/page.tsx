import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import KycForm from "./kyc-form";

export default async function KycPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: accounts }] = await Promise.all([
    supabase.from("profiles").select("kyc_status").eq("id", user.id).single(),
    supabase
      .from("bank_accounts")
      .select("id, bank_name, account_number, account_name")
      .eq("user_id", user.id),
  ]);

  if (profile?.kyc_status === "verified") {
    return (
      <main className="px-5 py-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-14 h-14 rounded-full bg-[#E9F8F0] flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B9C63" strokeWidth="2.4">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="font-display font-extrabold text-lg text-navy">You&apos;re verified</h1>
        <p className="text-sm text-ink-soft mt-2">
          Your identity has been confirmed. Deposit and withdrawal limits are lifted.
        </p>
      </main>
    );
  }

  // Paystack's BVN match requires an account number tied to that BVN — we
  // use an already-linked, already-verified bank account rather than
  // asking the person to type one in again.
  if (!accounts?.length) {
    return (
      <main className="px-5 py-6 text-center">
        <h1 className="font-display font-extrabold text-xl text-navy">Verify your identity</h1>
        <p className="text-sm text-ink-soft mt-3 leading-relaxed">
          Identity verification checks your BVN against a bank account you
          own. Link one first to continue.
        </p>
        <Link href="/dashboard/wallet/bank-accounts/new" className="btn-primary inline-block mt-5">
          Add bank account
        </Link>
      </main>
    );
  }

  return <KycForm accounts={accounts} />;
}
