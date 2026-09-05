import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ kyc_status: action === "approve" ? "verified" : "rejected" })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
