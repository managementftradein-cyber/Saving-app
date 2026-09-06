"use client";

import { useState } from "react";

export default function AddMoneyButton() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startPayment() {
    setError(null);
    const naira = Number(amount);
    if (!naira || naira < 100) {
      setError("Enter at least ₦100.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: naira }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not start payment.");
      return;
    }

    window.location.href = data.authorization_url;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white/16 rounded-xl py-2.5 text-sm font-bold"
      >
        + Add money
      </button>
    );
  }

  return (
    <div className="bg-surface rounded-xl p-3">
      <input
        type="number"
        min="100"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in ₦"
        className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none"
        autoFocus
      />
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={startPayment}
          disabled={loading}
          className="flex-1 bg-blue-deep text-white rounded-lg py-2 text-xs font-bold"
        >
          {loading ? "Redirecting…" : "Continue to Paystack"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
            setAmount("");
          }}
          className="px-3 rounded-lg border border-line text-xs font-bold text-navy"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
