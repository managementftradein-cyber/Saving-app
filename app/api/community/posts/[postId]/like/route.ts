import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("community_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("community_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ liked: false });
  }

  const { error } = await supabase
    .from("community_likes")
    .insert({ post_id: postId, user_id: user.id });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ liked: true });
}
