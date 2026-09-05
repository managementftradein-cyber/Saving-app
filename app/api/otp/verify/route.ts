import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  }
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

  if (data.user_id !== user.id) {
    return NextResponse.json({ error: "That verification code does not belong to this account." }, { status: 403 });
  }

  // If this was a signup-email verification, also flip the confirmation
  // flag on the underlying Supabase Auth user so they can sign in normally.
  // This is a secondary, cosmetic step — the flag that actually gates
  // access (profiles.email_verified) was already set inside verify_otp()
  // above, so a failure here should never undo a real verification.
  if (purpose === "signup" && data.user_id) {
    // Make the verification state durable even if the auth-user profile
    // trigger was delayed, disabled, or missing when the account was created.
    // This is deliberately an upsert: the middleware gates protected routes
    // on this row, so a successful OTP must always leave a verified profile.
    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        { id: data.user_id, email_verified: true },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("profile verification upsert failed:", profileError);
      return NextResponse.json(
        { error: "Your code was valid, but we could not finish activating your account. Please try again." },
        { status: 500 }
      );
    }

    try {
      const { error: confirmError } = await admin.auth.admin.updateUserById(
        data.user_id,
        { email_confirm: true }
      );
      if (confirmError) console.error("updateUserById (non-fatal) failed:", confirmError);
    } catch (confirmError) {
      console.error("updateUserById (non-fatal) failed:", confirmError);
    }
  }

  // Confirm the exact state the middleware will read before telling the
  // browser to leave the verification page. This prevents a successful OTP
  // from being followed by an immediate middleware redirect back to /auth/verify.
  if (purpose === "signup" && data.user_id) {
    const { data: verifiedProfile, error: verifyProfileError } = await admin
      .from("profiles")
      .select("email_verified")
      .eq("id", data.user_id)
      .maybeSingle();

    if (verifyProfileError || !verifiedProfile?.email_verified) {
      console.error("verification state could not be confirmed:", verifyProfileError);
      return NextResponse.json(
        { error: "Verification succeeded, but your account is not ready yet. Please try again." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, redirectTo: "/onboarding/profile" });
}
