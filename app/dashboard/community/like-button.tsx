"use client";

import { useState } from "react";

export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);

    // Optimistic update
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    const res = await fetch(`/api/community/posts/${postId}/like`, { method: "POST" });
    setBusy(false);

    if (!res.ok) {
      // Revert on failure
      setLiked(liked);
      setCount((c) => c + (nextLiked ? -1 : 1));
    }
  }

  return (
    <button
      onClick={toggle}
      className={`text-[11.5px] font-medium flex items-center gap-1 ${
        liked ? "text-red-500" : "text-ink-soft"
      }`}
    >
      {liked ? "❤" : "🤍"} {count}
    </button>
  );
}
