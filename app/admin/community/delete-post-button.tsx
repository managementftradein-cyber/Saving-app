"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/admin/community/posts/${postId}`, { method: "DELETE" });
    setLoading(false);

    if (res.ok) router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex gap-1.5 flex-shrink-0">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-[10px] font-bold text-white bg-[#C5453A] rounded-full px-2.5 py-1"
        >
          {loading ? "…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-[10px] font-bold text-ink-soft"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-[10px] font-bold text-[#C5453A] flex-shrink-0"
    >
      Delete
    </button>
  );
}
