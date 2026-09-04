import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const destination = body?.destination?.trim();
  const purpose = body?.purpose ?? "signup";
  const code = body?.code?.trim();

  if (!destination || !code) {
    return NextResponse.json({ error: "Missing destination or code." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("verify_otp", { p_destination: destination, p_purpose: purpose, p_code: code })
    .single<{ success: boolean; user_id: string | null; message: string }>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data.success) {
    return NextResponse.json({ error: data.message }, { status: 400 });
  }

  // If this was a signup-email verification, also flip the confirmation
  // flag on the underlying Supabase Auth user so they can sign in normally.
  if (purpose === "signup" && data.user_id) {
    await admin.auth.admin.updateUserById(data.user_id, { email_confirm: true });
  }

  return NextResponse.json({ success: true, userId: data.user_id });
}
