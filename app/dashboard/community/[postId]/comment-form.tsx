"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim() }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not comment.");
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <div className="mt-5 sticky bottom-[84px]">
      <div className="flex gap-2 bg-surface rounded-2xl border border-line p-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 text-sm outline-none px-2"
          maxLength={1000}
        />
        <button
          onClick={submit}
          disabled={loading || !body.trim()}
          className="bg-blue-deep text-white text-xs font-bold rounded-xl px-4"
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5 px-1">{error}</p>}
    </div>
  );
}
