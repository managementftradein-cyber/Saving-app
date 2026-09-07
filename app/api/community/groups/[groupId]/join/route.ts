import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("community_group_members")
    .select("group_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("community_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ joined: false });
  }

  const { error } = await supabase
    .from("community_group_members")
    .insert({ group_id: groupId, user_id: user.id });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ joined: true });
}
