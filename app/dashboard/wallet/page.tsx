import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKobo } from "@/lib/format";
import AddMoneyButton from "./add-money-button";

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: wallet }, { data: transactions }] = await Promise.all([
    supabase.from("wallets").select("balance_kobo").eq("user_id", user.id).single(),
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const TYPE_LABEL: Record<string, string> = {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    transfer_to_goal: "Transfer to goal",
    transfer_from_goal: "Withdrawal from goal",
  };
  const IS_CREDIT = new Set(["deposit", "transfer_from_goal"]);

  return (
    <main className="px-5 py-6">
      <h1 className="font-display font-extrabold text-xl text-navy">Wallet</h1>

      <div className="mt-5 rounded-[22px] bg-gradient-to-br from-blue to-blue-deep text-white p-5">
        <p className="text-xs opacity-80">Available balance</p>
        <p className="font-display font-extrabold text-2xl mt-1.5">
          {formatKobo(wallet?.balance_kobo)}
        </p>
        <div className="mt-4">
          <AddMoneyButton />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-display font-extrabold text-sm text-navy mb-2.5">
          Transaction history
        </h2>

        {!transactions?.length && (
          <p className="text-sm text-ink-soft">No transactions yet.</p>
        )}

        <div className="rounded-2xl border border-line bg-white divide-y divide-line">
          {transactions?.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-ink">
                  {tx.description ?? TYPE_LABEL[tx.type] ?? tx.type}
                </p>
                <p className="text-[11px] text-ink-soft mt-0.5">
                  {new Date(tx.created_at).toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <span
                className={`text-[13px] font-bold ${
                  IS_CREDIT.has(tx.type) ? "text-success" : "text-ink"
                }`}
              >
                {IS_CREDIT.has(tx.type) ? "+" : "-"}
                {formatKobo(tx.amount_kobo)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
