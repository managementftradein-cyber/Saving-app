"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotificationItem({
  id,
  title,
  body,
  link,
  createdAt,
  read,
  icon,
}: {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  read: boolean;
  icon: { emoji: string; bg: string };
}) {
  const router = useRouter();

  async function handleClick() {
    if (!read) {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      router.refresh();
    }
  }

  const content = (
    <div
      className={`flex gap-3 rounded-2xl border p-3.5 ${
        read ? "bg-surface border-line" : "bg-sky-soft border-blue/30"
      }`}
    >
      <div className={`w-9 h-9 rounded-full ${icon.bg} flex items-center justify-center flex-shrink-0 text-sm`}>
        {icon.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        {body && <p className="text-[12px] text-ink-soft mt-0.5 line-clamp-2">{body}</p>}
        <p className="text-[10.5px] text-ink-soft mt-1">
          {new Date(createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>
      {!read && <span className="w-2 h-2 rounded-full bg-amber flex-shrink-0 mt-1.5" />}
    </div>
  );

  if (link) {
    return (
      <Link href={link} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={handleClick} className="text-left w-full">
      {content}
    </button>
  );
}
