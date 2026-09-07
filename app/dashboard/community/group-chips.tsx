"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GroupChips({
  groups,
  myGroupIds,
}: {
  groups: { id: string; name: string }[];
  myGroupIds: string[];
}) {
  const router = useRouter();
  const [joined, setJoined] = useState(new Set(myGroupIds));
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(groupId: string) {
    setPending(groupId);
    const res = await fetch(`/api/community/groups/${groupId}/join`, { method: "POST" });
    const data = await res.json();
    setPending(null);

    if (!res.ok) return;

    setJoined((prev) => {
      const next = new Set(prev);
      if (data.joined) next.add(groupId);
      else next.delete(groupId);
      return next;
    });
    router.refresh();
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mt-4 mb-2 -mx-1 px-1">
      {groups.map((g) => {
        const isJoined = joined.has(g.id);
        return (
          <button
            key={g.id}
            onClick={() => toggle(g.id)}
            disabled={pending === g.id}
            className={`flex-shrink-0 text-[11.5px] font-bold px-3.5 py-2 rounded-full whitespace-nowrap ${
              isJoined ? "bg-blue-deep text-white" : "bg-sky text-navy"
            }`}
          >
            {isJoined ? "✓ " : "+ "}
            {g.name}
          </button>
        );
      })}
    </div>
  );
}
