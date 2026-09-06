import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: allBadges }, { data: earned }] = await Promise.all([
    supabase.from("badges").select("id, code, name, description, icon").order("name"),
    supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", user.id),
  ]);

  const earnedMap = new Map((earned ?? []).map((e) => [e.badge_id, e.earned_at]));

  return (
    <main className="px-5 py-6">
      <h1 className="font-display font-extrabold text-xl text-navy">Rewards &amp; badges</h1>
      <p className="text-sm text-ink-soft mt-1">
        {earned?.length ?? 0} of {allBadges?.length ?? 0} earned
      </p>

      <div className="grid grid-cols-2 gap-3 mt-5">
        {allBadges?.map((badge) => {
          const isEarned = earnedMap.has(badge.id);
          return (
            <div
              key={badge.id}
              className={`rounded-2xl border p-4 text-center ${
                isEarned ? "border-line bg-surface" : "border-line bg-surface opacity-40"
              }`}
            >
              <div className="text-3xl mb-2">{isEarned ? badge.icon : "🔒"}</div>
              <p className="text-[12.5px] font-bold text-ink">{badge.name}</p>
              <p className="text-[10.5px] text-ink-soft mt-1 leading-snug">
                {badge.description}
              </p>
              {isEarned && (
                <p className="text-[9.5px] text-success font-bold mt-2">
                  {new Date(earnedMap.get(badge.id)!).toLocaleDateString("en-NG", {
                    dateStyle: "medium",
                  })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
