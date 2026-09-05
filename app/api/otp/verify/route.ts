import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const CODE_RE = /^\d{6}$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const destination = typeof body?.destination === "string" ? body.destination.trim() : "";
  const purpose = body?.purpose ?? "signup";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!destination || !code || !CODE_RE.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
  }

  if (purpose !== "signup" && purpose !== "phone_change") {
    return NextResponse.json({ error: "Invalid verification purpose." }, { status: 400 });
  }

  if (purpose === "signup" && !EMAIL_RE.test(destination)) {
    return NextResponse.json({ error: "Signup verification uses email." }, { status: 400 });
  }

  if (purpose === "phone_change" && !PHONE_RE.test(destination)) {
    return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  }

  const validDestination =
    purpose === "signup"
      ? user.email?.toLowerCase() === destination.toLowerCase()
      : PHONE_RE.test(destination);

  if (!validDestination) {
    return NextResponse.json({ error: "This verification code does not belong to your account." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("verify_otp", {
      p_destination: destination,
      p_purpose: purpose,
      p_code: code,
    })
    .single<{ success: boolean; user_id: string | null; message: string }>();

  if (error) {
    console.error("OTP verification failed:", error);
    return NextResponse.json({ error: "Verification could not be completed. Please try again." }, { status: 500 });
  }

  if (!data.success || data.user_id !== user.id) {
    return NextResponse.json({ error: data.message || "That code is not valid." }, { status: 400 });
  }

  if (purpose === "signup") {
    const { error: confirmError } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (confirmError) {
      console.error("Could not confirm Auth email:", confirmError);
      // The application's own email_verified flag is the access gate, so a
      // transient Auth metadata failure does not invalidate a valid OTP.
    }
  }

  // Do not return user ids, database details, or debug information to the UI.
  return NextResponse.json({ success: true });
}
