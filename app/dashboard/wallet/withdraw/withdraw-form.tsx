"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Account = { id: string; bank_name: string; account_number: string; account_name: string };

export default function WithdrawForm({
  balanceKobo,
  balanceDisplay,
  accounts,
}: {
  balanceKobo: number;
  balanceDisplay: string;
  accounts: Account[];
}) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    const naira = Number(amount);

    if (!naira || naira <= 0) {
      setError("Enter an amount greater than ₦0.");
      return;
    }
    if (naira * 100 > balanceKobo) {
      setError("That's more than your wallet balance.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/wallet/withdraw-to-bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankAccountId: accountId, amount: naira }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Withdrawal could not be started.");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/dashboard/wallet");
      router.refresh();
    }, 1800);
  }

  if (success) {
    return (
      <main className="px-5 py-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-14 h-14 rounded-full bg-[#E9F8F0] flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B9C63" strokeWidth="2.4">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="font-display font-extrabold text-lg text-navy">Withdrawal started</h1>
        <p className="text-sm text-ink-soft mt-2">
          Your money is on its way — this usually takes a few minutes.
        </p>
      </main>
    );
  }

  return (
    <main className="px-5 py-6">
      <h1 className="font-display font-extrabold text-xl text-navy">Withdraw</h1>
      <p className="text-sm text-ink-soft mt-1">Available: {balanceDisplay}</p>

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-navy">To account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="input-field mt-1.5"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bank_name} · {a.account_name} · •••• {a.account_number.slice(-4)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-navy">Amount (₦)</label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field mt-1.5"
            placeholder="5000"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button onClick={handleSubmit} disabled={loading} className="btn-primary mt-2">
          {loading ? "Processing…" : "Withdraw"}
        </button>
      </div>
    </main>
  );
}
