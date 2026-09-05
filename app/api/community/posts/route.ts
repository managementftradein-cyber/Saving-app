import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const bodyText = typeof body?.body === "string" ? body.body.trim() : "";
  const kind = ["text", "image", "poll", "question"].includes(body?.kind)
    ? body.kind
    : "text";
  const groupId = body?.groupId || null;

  if (!bodyText || bodyText.length > 2000) {
    return NextResponse.json(
      { error: "Write something between 1 and 2000 characters." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: user.id,
      body: bodyText,
      kind,
      group_id: groupId,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, postId: data.id });
}
