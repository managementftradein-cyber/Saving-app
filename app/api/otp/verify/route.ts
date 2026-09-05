import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const destination = typeof body?.destination === "string" ? body.destination.trim() : "";
  const purpose = body?.purpose ?? "signup";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!destination || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
  }

  if (purpose === "signup" && user.email?.toLowerCase() !== destination.toLowerCase()) {
    return NextResponse.json({ error: "That email does not belong to the signed-in account." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("verify_otp", {
    p_destination: destination,
    p_purpose: purpose,
    p_code: code,
  }).single<{ success: boolean; user_id: string | null; message: string }>();

  if (error) {
    console.error("OTP verification failed:", error.message);
    return NextResponse.json({ error: "We couldn't verify that code. Please try again." }, { status: 500 });
  }

  if (!data.success || data.user_id !== user.id) {
    return NextResponse.json({ error: data.message || "That code is invalid or expired." }, { status: 400 });
  }

  if (purpose === "signup") {
    // Repair the profile if the signup trigger did not create it, then make
    // the verification state explicit. This removes the trigger race that
    // previously caused the verified user to bounce back to /auth/verify.
    const { error: profileError } = await admin.from("profiles").upsert({
      id: user.id,
      email_verified: true,
    }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile verification update failed:", profileError.message);
      return NextResponse.json({ error: "Your code was accepted, but we couldn't finish setting up your account. Please try again." }, { status: 500 });
    }

    const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (authError) {
      // The app profile is already verified, so don't undo the successful OTP.
      console.error("Auth email confirmation update failed:", authError.message);
    }
  }

  return NextResponse.json({ success: true });
}
