"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkAllReadButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch("/api/notifications/read-all", { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={handleClick} disabled={loading} className="text-xs font-bold text-blue-deep">
      {loading ? "…" : "Mark all read"}
    </button>
  );
}
