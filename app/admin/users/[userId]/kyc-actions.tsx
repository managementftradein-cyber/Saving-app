"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function KycActions({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    setLoading(action);
    setError(null);

    const res = await fetch(`/api/admin/users/${userId}/kyc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);

    if (!res.ok) {
      setError(data.error ?? "Could not update KYC status.");
      return;
    }

    router.refresh();
  }

  if (currentStatus !== "pending") {
    return (
      <p className="text-xs text-ink-soft">
        No action needed — status is &quot;{currentStatus.replace("_", " ")}&quot;.
      </p>
    );
  }

  return (
    <div>
      <div className="flex gap-3">
        <button
          onClick={() => act("approve")}
          disabled={loading !== null}
          className="flex-1 bg-success text-white text-xs font-bold rounded-xl py-2.5"
        >
          {loading === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          onClick={() => act("reject")}
          disabled={loading !== null}
          className="flex-1 bg-[#C5453A] text-white text-xs font-bold rounded-xl py-2.5"
        >
          {loading === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
