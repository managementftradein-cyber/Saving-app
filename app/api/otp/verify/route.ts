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

  // Confirm the Auth user as well. This makes the flow resilient even if
  // Supabase Auth's own "Confirm email" setting is enabled.
  if (purpose === "signup" && data.user_id) {
    const { error: confirmError } = await admin.auth.admin.updateUserById(
      data.user_id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error("updateUserById failed:", confirmError);
      return NextResponse.json(
        { error: "Email was verified, but the account could not be activated. Please try logging in again." },
        { status: 500 }
      );
    }

    // Verify that the application profile was actually updated. The SQL
    // function can return success even when an unexpected/missing profile
    // row means the UPDATE matched zero rows. Never report success to the
    // browser in that situation.
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email_verified")
      .eq("id", data.user_id)
      .maybeSingle();

    if (profileError || !profile?.email_verified) {
      console.error("Profile verification state is inconsistent:", profileError?.message);
      return NextResponse.json(
        { error: "Verification completed, but your profile could not be activated. Please try again." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, userId: data.user_id });
}
