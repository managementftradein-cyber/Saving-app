"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PostForm({ groups }: { groups: { id: string; name: string }[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("Write something first.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/community/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim(), groupId: groupId || null }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not post.");
      return;
    }

    router.push("/dashboard/community");
    router.refresh();
  }

  return (
    <main className="px-5 py-6">
      <h1 className="font-display font-extrabold text-xl text-navy">New post</h1>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="input-field min-h-[120px] resize-none"
          placeholder="Share a savings win, ask a question, or start a challenge…"
          maxLength={2000}
        />

        {groups.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-navy">Post to a group (optional)</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="input-field mt-1.5"
            >
              <option value="">General feed</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Posting…" : "Post"}
        </button>
      </form>
    </main>
  );
}
