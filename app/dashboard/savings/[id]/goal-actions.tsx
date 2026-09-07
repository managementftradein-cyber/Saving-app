"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatKobo } from "@/lib/format";

export default function GoalActions({
  goalId,
  currentAmountKobo,
}: {
  goalId: string;
  currentAmountKobo: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"fund" | "withdraw" | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    const naira = Number(amount);
    if (!naira || naira <= 0) {
      setError("Enter an amount greater than ₦0.");
      return;
    }

    setLoading(true);
    const res = await fetch(
      mode === "fund" ? "/api/wallet/transfer-to-goal" : "/api/wallet/withdraw",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, amount: naira }),
      }
    );
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setMode(null);
    setAmount("");
    router.refresh();
  }

  return (
    <div className="mt-5">
      {!mode && (
        <div className="flex gap-3">
          <button onClick={() => setMode("fund")} className="btn-primary flex-1 !py-3">
            Fund goal
          </button>
          <button
            onClick={() => setMode("withdraw")}
            disabled={currentAmountKobo <= 0}
            className="btn-secondary flex-1 !py-3"
          >
            Withdraw
          </button>
        </div>
      )}

      {mode && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold text-navy mb-2">
            {mode === "fund" ? "Move money from wallet" : "Withdraw to wallet"}
          </p>
          {mode === "withdraw" && (
            <p className="text-[11px] text-ink-soft mb-2">
              Available: {formatKobo(currentAmountKobo)}. Withdrawing before the
              lock period ends applies a 5% penalty.
            </p>
          )}
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field"
            placeholder="Amount in ₦"
            autoFocus
          />
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <div className="flex gap-3 mt-3">
            <button
              onClick={submit}
              disabled={loading}
              className="btn-primary flex-1 !py-3"
            >
              {loading ? "Processing…" : "Confirm"}
            </button>
            <button
              onClick={() => {
                setMode(null);
                setError(null);
                setAmount("");
              }}
              className="btn-secondary flex-1 !py-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
