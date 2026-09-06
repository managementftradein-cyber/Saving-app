import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKobo } from "@/lib/format";
import WithdrawForm from "./withdraw-form";

export default async function WithdrawPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: wallet }, { data: accounts }, { data: profile }] = await Promise.all([
    supabase.from("wallets").select("balance_kobo").eq("user_id", user.id).single(),
    supabase
      .from("bank_accounts")
      .select("id, bank_name, account_number, account_name")
      .eq("user_id", user.id),
    supabase.from("profiles").select("kyc_status").eq("id", user.id).single(),
  ]);

  if (profile?.kyc_status !== "verified") {
    return (
      <main className="px-5 py-6">
        <h1 className="font-display font-extrabold text-xl text-navy">Withdraw</h1>
        <div className="mt-6 rounded-2xl border border-amber bg-[#FDF3E7] p-4 text-sm text-[#8A5A1E]">
          KYC verification is required before withdrawing to a bank account.
        </div>
        <Link href="/onboarding/profile" className="btn-primary mt-4 block text-center">
          Complete KYC
        </Link>
      </main>
    );
  }

  if (!accounts?.length) {
    return (
      <main className="px-5 py-6">
        <h1 className="font-display font-extrabold text-xl text-navy">Withdraw</h1>
        <div className="mt-6 text-center">
          <p className="text-sm text-ink-soft">Link a bank account first to withdraw.</p>
          <Link href="/dashboard/wallet/bank-accounts/new" className="btn-primary inline-block mt-4">
            Add bank account
          </Link>
        </div>
      </main>
    );
  }

  return (
    <WithdrawForm
      balanceKobo={wallet?.balance_kobo ?? 0}
      balanceDisplay={formatKobo(wallet?.balance_kobo)}
      accounts={accounts}
    />
  );
}
