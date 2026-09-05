import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { postId } = await params;
  const admin = createAdminClient();

  const { error } = await admin.from("community_posts").delete().eq("id", postId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
