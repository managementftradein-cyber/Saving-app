import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendOtpEmail } from "@/lib/email";
import { sendOtpSms } from "@/lib/sms";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const channel = body?.channel;
  const destination = typeof body?.destination === "string" ? body.destination.trim() : "";
  const purpose = body?.purpose ?? "signup";

  if (channel !== "email" && channel !== "phone") {
    return NextResponse.json({ error: "Invalid verification channel." }, { status: 400 });
  }

  if (purpose !== "signup" && purpose !== "phone_change") {
    return NextResponse.json({ error: "Invalid verification purpose." }, { status: 400 });
  }

  if (purpose === "signup" && channel !== "email") {
    return NextResponse.json({ error: "Signup verification uses email." }, { status: 400 });
  }

  if (purpose === "phone_change" && channel !== "phone") {
    return NextResponse.json({ error: "Phone verification uses SMS." }, { status: 400 });
  }

  if (channel === "email" && !EMAIL_RE.test(destination)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (channel === "phone" && !PHONE_RE.test(destination)) {
    return NextResponse.json(
      { error: "Enter a valid phone number in international format, e.g. +2348012345678." },
      { status: 400 }
    );
  }

  // Never trust a userId supplied by the browser. The authenticated Supabase
  // session is the source of truth for which account receives the OTP.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  }

  if (purpose === "signup" && channel === "email" && user.email?.toLowerCase() !== destination.toLowerCase()) {
    return NextResponse.json({ error: "The verification email does not match this account." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("request_otp", {
      p_user_id: user.id,
      p_channel: channel,
      p_destination: destination,
      p_purpose: purpose,
    })
    .single<{ code: string; otp_id: string }>();

  if (error) {
    const status = /wait|too many|rate/i.test(error.message) ? 429 : 500;
    return NextResponse.json({ error: status === 429 ? error.message : "Could not create a verification code." }, { status });
  }

  try {
    if (channel === "email") {
      await sendOtpEmail(destination, data.code);
    } else {
      await sendOtpSms(destination, data.code);
    }
  } catch (sendError) {
    console.error("OTP send failed:", sendError);
    return NextResponse.json({ error: "Could not send the verification code. Try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
