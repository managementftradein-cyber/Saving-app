import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RemoveBankButton from "./remove-bank-button";

export default async function BankAccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, bank_name, account_number, account_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="px-5 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-extrabold text-xl text-navy">Bank accounts</h1>
        <Link
          href="/dashboard/wallet/bank-accounts/new"
          className="text-xs font-bold text-white bg-blue-deep rounded-full px-3.5 py-2"
        >
          + Add
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {accounts?.map((acc) => (
          <div key={acc.id} className="rounded-2xl border border-line bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">{acc.bank_name}</p>
              <p className="text-[12px] text-ink-soft mt-0.5">
                {acc.account_name} · •••• {acc.account_number.slice(-4)}
              </p>
            </div>
            <RemoveBankButton bankAccountId={acc.id} />
          </div>
        ))}
        {!accounts?.length && (
          <p className="text-sm text-ink-soft text-center py-8">
            No bank accounts linked yet.
          </p>
        )}
      </div>
    </main>
  );
}
