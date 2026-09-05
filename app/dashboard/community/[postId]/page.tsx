import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LikeButton from "../like-button";
import CommentForm from "./comment-form";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: post }, { data: comments }, { data: myLike }] = await Promise.all([
    supabase
      .from("community_posts")
      .select("id, body, like_count, comment_count, created_at, profiles(full_name)")
      .eq("id", postId)
      .single(),
    supabase
      .from("community_comments")
      .select("id, body, created_at, profiles(full_name)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true }),
    supabase
      .from("community_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!post) notFound();

  const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;

  return (
    <main className="px-5 py-6">
      <div className="rounded-2xl border border-line bg-white p-4">
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
            <p className="text-[12.5px] font-bold text-ink">{author?.full_name ?? "Someone"}</p>
            <p className="text-[10.5px] text-ink-soft">
              {new Date(post.created_at).toLocaleString("en-NG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>

        <p className="text-[13.5px] text-ink mt-3 leading-relaxed">{post.body}</p>

        <div className="flex items-center gap-5 mt-3">
          <LikeButton
            postId={post.id}
            initialLiked={!!myLike}
            initialCount={post.like_count}
          />
          <span className="text-[11.5px] text-ink-soft">💬 {post.comment_count}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {comments?.map((comment) => {
          const commentAuthor = Array.isArray(comment.profiles)
            ? comment.profiles[0]
            : comment.profiles;
          return (
            <div key={comment.id} className="rounded-xl bg-white border border-line p-3">
              <p className="text-[11.5px] font-bold text-navy">
                {commentAuthor?.full_name ?? "Someone"}
              </p>
              <p className="text-[13px] text-ink mt-1">{comment.body}</p>
            </div>
          );
        })}
        {!comments?.length && (
          <p className="text-sm text-ink-soft text-center">No comments yet.</p>
        )}
      </div>

      <CommentForm postId={postId} />
    </main>
  );
}
