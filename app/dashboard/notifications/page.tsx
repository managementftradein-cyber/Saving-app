import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarkAllReadButton from "./mark-all-read-button";
import NotificationItem from "./notification-item";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const hasUnread = notifications?.some((n) => !n.read_at);

  const ICONS: Record<string, { emoji: string; bg: string }> = {
    deposit_successful: { emoji: "✓", bg: "bg-[#E9F8F0]" },
    withdrawal_successful: { emoji: "↑", bg: "bg-[#FDF3E7]" },
    transfer_to_goal: { emoji: "🎯", bg: "bg-sky" },
    community_reply: { emoji: "💬", bg: "bg-sky" },
    community_like: { emoji: "❤", bg: "bg-[#FCECEB]" },
    savings_reminder: { emoji: "⏰", bg: "bg-[#FDF3E7]" },
    badge_earned: { emoji: "🏅", bg: "bg-[#FBEFFB]" },
  };

  return (
    <main className="px-5 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display font-extrabold text-xl text-navy">Notifications</h1>
        {hasUnread && <MarkAllReadButton />}
      </div>

      <div className="flex flex-col gap-2 mt-4">
        {notifications?.map((n) => (
          <NotificationItem
            key={n.id}
            id={n.id}
            title={n.title}
            body={n.body}
            link={n.link}
            createdAt={n.created_at}
            read={!!n.read_at}
            icon={ICONS[n.type] ?? { emoji: "🔔", bg: "bg-sky" }}
          />
        ))}
        {!notifications?.length && (
          <p className="text-sm text-ink-soft text-center py-10">
            No notifications yet.
          </p>
        )}
      </div>
    </main>
  );
}
