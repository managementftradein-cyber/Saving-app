import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import DeletePostButton from "./delete-post-button";

export default async function AdminCommunityPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: posts } = await admin
    .from("community_posts")
    .select("id, body, like_count, comment_count, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h2 className="font-display font-extrabold text-base text-navy mb-4">
        Community moderation
      </h2>

      <div className="flex flex-col gap-3">
        {posts?.map((post) => {
          const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
          return (
            <div key={post.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-navy">{author?.full_name ?? "Someone"}</p>
                  <p className="text-[10px] text-ink-soft">
                    {new Date(post.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                  </p>
                </div>
                <DeletePostButton postId={post.id} />
              </div>
              <p className="text-[13px] text-ink mt-2">{post.body}</p>
              <p className="text-[11px] text-ink-soft mt-2">
                ❤ {post.like_count} · 💬 {post.comment_count}
              </p>
            </div>
          );
        })}
        {!posts?.length && (
          <p className="text-sm text-ink-soft text-center py-6">No posts yet.</p>
        )}
      </div>
    </div>
  );
}
