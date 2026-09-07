"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemoveBankButton({ bankAccountId }: { bankAccountId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    const res = await fetch(`/api/bank-accounts/${bankAccountId}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleRemove}
          disabled={loading}
          className="text-[11px] font-bold text-white bg-[#C5453A] rounded-full px-3 py-1.5"
        >
          {loading ? "…" : "Confirm"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-[11px] font-bold text-ink-soft">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="text-[11px] font-bold text-[#C5453A]">
      Remove
    </button>
  );
}
