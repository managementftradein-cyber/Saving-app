import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GroupChips from "./group-chips";
import LikeButton from "./like-button";

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: posts }, { data: groups }, { data: myGroups }, { data: leaderboard }, { data: myLikes }] =
    await Promise.all([
      supabase
        .from("community_posts")
        .select("id, body, kind, like_count, comment_count, created_at, user_id, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("community_groups").select("id, name").order("name"),
      supabase.from("community_group_members").select("group_id").eq("user_id", user.id),
      supabase
        .from("weekly_savings_leaderboard")
        .select("*")
        .gt("saved_this_week_kobo", 0)
        .limit(3),
      supabase.from("community_likes").select("post_id").eq("user_id", user.id),
    ]);

  const myGroupIds = new Set((myGroups ?? []).map((g) => g.group_id));
  const myLikedPostIds = new Set((myLikes ?? []).map((l) => l.post_id));

  return (
    <main className="px-5 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-extrabold text-xl text-navy">Community</h1>
        <Link
          href="/dashboard/community/new"
          className="text-xs font-bold text-white bg-blue-deep rounded-full px-3.5 py-2"
        >
          + Post
        </Link>
      </div>

      <GroupChips groups={groups ?? []} myGroupIds={[...myGroupIds]} />

      {!!leaderboard?.length && (
        <div className="mt-2 mb-5 rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-bold text-navy mb-2.5">Top savers this week</p>
          <div className="flex flex-col gap-2">
            {leaderboard.map((row, i) => (
              <div key={row.user_id} className="flex items-center justify-between text-[13px]">
                <span className="text-ink">
                  {["🥇", "🥈", "🥉"][i]} {row.full_name ?? "Someone"}
                </span>
                <span className="text-ink-soft">
                  ₦{(row.saved_this_week_kobo / 100).toLocaleString("en-NG")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {!posts?.length && (
          <p className="text-sm text-ink-soft text-center mt-8">
            No posts yet — be the first to share something.
          </p>
        )}

        {posts?.map((post) => {
          const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
          return (
            <div key={post.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue text-white flex items-center justify-center text-[11px] font-bold font-display">
                  {(author?.full_name ?? "N E")
                    .split(" ")
                    .map((p: string) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-[12.5px] font-bold text-ink">
                    {author?.full_name ?? "Someone"}
                  </p>
                  <p className="text-[10.5px] text-ink-soft">
                    {new Date(post.created_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>

              <Link href={`/dashboard/community/${post.id}`}>
                <p className="text-[13px] text-ink mt-3 leading-relaxed">{post.body}</p>
              </Link>

              <div className="flex items-center gap-5 mt-3">
                <LikeButton
                  postId={post.id}
                  initialLiked={myLikedPostIds.has(post.id)}
                  initialCount={post.like_count}
                />
                <Link
                  href={`/dashboard/community/${post.id}`}
                  className="text-[11.5px] text-ink-soft font-medium"
                >
                  💬 {post.comment_count}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
