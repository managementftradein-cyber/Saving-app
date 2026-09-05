import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOtpEmail } from "@/lib/email";
import { sendOtpSms } from "@/lib/sms";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  }

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
  if (channel === "email" && !EMAIL_RE.test(destination)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (channel === "phone" && !PHONE_RE.test(destination)) {
    return NextResponse.json({ error: "Enter a valid phone number in international format, e.g. +2348012345678." }, { status: 400 });
  }

  // Never trust a user id supplied by the browser. The authenticated session
  // determines which account owns this OTP.
  if (channel === "email" && user.email?.toLowerCase() !== destination.toLowerCase()) {
    return NextResponse.json({ error: "That email does not belong to the signed-in account." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("request_otp", {
    p_user_id: user.id,
    p_channel: channel,
    p_destination: destination,
    p_purpose: purpose,
  }).single<{ code: string; otp_id: string }>();

  if (error || !data) {
    const message = error?.message ?? "Could not create a verification code.";
    const status = /wait|too many|requests/i.test(message) ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  try {
    if (channel === "email") {
      await sendOtpEmail(destination, data.code);
    } else {
      await sendOtpSms(destination, data.code);
    }
  } catch (sendError) {
    console.error("OTP send failed:", sendError);
    return NextResponse.json({ error: "Could not send the code. Try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
