"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Bank = { name: string; code: string };

export default function AddBankForm() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/banks")
      .then((res) => res.json())
      .then((data) => setBanks(data.banks ?? []))
      .catch(() => setError("Could not load bank list."))
      .finally(() => setBanksLoading(false));
  }, []);

  async function resolveAccount() {
    setError(null);
    setResolvedName(null);

    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      setError("Select a bank and enter a valid 10-digit account number.");
      return;
    }

    setResolving(true);
    const res = await fetch("/api/bank-accounts/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankCode, accountNumber }),
    });
    const data = await res.json();
    setResolving(false);

    if (!res.ok) {
      setError(data.error ?? "Could not verify this account.");
      return;
    }

    setResolvedName(data.accountName);
  }

  async function saveAccount() {
    if (!resolvedName) return;
    setSaving(true);
    setError(null);

    const bankName = banks.find((b) => b.code === bankCode)?.name ?? "";

    const res = await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankCode, bankName, accountNumber, accountName: resolvedName }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save this account.");
      return;
    }

    router.push("/dashboard/wallet/bank-accounts");
    router.refresh();
  }

  return (
    <main className="px-5 py-6">
      <h1 className="font-display font-extrabold text-xl text-navy">Add bank account</h1>
      <p className="text-sm text-ink-soft mt-1">
        We'll verify the account name before saving.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-navy">Bank</label>
          <select
            value={bankCode}
            onChange={(e) => {
              setBankCode(e.target.value);
              setResolvedName(null);
            }}
            disabled={banksLoading}
            className="input-field mt-1.5"
          >
            <option value="">{banksLoading ? "Loading banks…" : "Select a bank"}</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-navy">Account number</label>
          <input
            value={accountNumber}
            onChange={(e) => {
              setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
              setResolvedName(null);
            }}
            className="input-field mt-1.5"
            placeholder="0123456789"
            inputMode="numeric"
          />
        </div>

        {!resolvedName && (
          <button
            type="button"
            onClick={resolveAccount}
            disabled={resolving || !bankCode || accountNumber.length !== 10}
            className="btn-secondary"
          >
            {resolving ? "Verifying…" : "Verify account"}
          </button>
        )}

        {resolvedName && (
          <div className="rounded-xl bg-[#E9F8F0] border border-success/30 p-3">
            <p className="text-[11px] text-success font-semibold">Account verified</p>
            <p className="text-sm font-bold text-ink mt-0.5">{resolvedName}</p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        {resolvedName && (
          <button onClick={saveAccount} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save bank account"}
          </button>
        )}
      </div>
    </main>
  );
}
