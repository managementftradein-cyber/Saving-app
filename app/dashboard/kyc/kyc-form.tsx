"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Account = { id: string; bank_name: string; account_number: string; account_name: string };

export default function KycForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [bvn, setBvn] = useState("");
  const [bankAccountId, setBankAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{11}$/.test(bvn)) {
      setError("BVN must be exactly 11 digits.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/kyc/verify-bvn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bvn, bankAccountId }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Verification failed.");
      return;
    }

    router.push("/dashboard/profile");
    router.refresh();
  }

  return (
    <main className="px-5 py-6">
      <h1 className="font-display font-extrabold text-xl text-navy">Verify your identity</h1>
      <p className="text-sm text-ink-soft mt-2 leading-relaxed">
        We check your BVN against your linked bank account to confirm
        it&apos;s really you — nothing beyond the last 4 digits is stored.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-navy">
            Bank Verification Number (BVN)
          </label>
          <input
            value={bvn}
            onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
            className="input-field mt-1.5"
            placeholder="12345678901"
            inputMode="numeric"
          />
          <p className="text-[11px] text-ink-soft mt-1">
            Dial *565*0# on your registered phone if you don't know your BVN.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-navy">Verify against</label>
          <select
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
            className="input-field mt-1.5"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bank_name} · {a.account_name} · •••• {a.account_number.slice(-4)}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-ink-soft mt-1">
            The BVN must belong to whoever owns this bank account.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Verifying…" : "Verify identity"}
        </button>

        <p className="text-[11px] text-ink-soft text-center">
          Until verified, your wallet balance is capped at ₦50,000.
        </p>
      </form>
    </main>
  );
}
