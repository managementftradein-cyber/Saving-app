import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendOtpEmail } from "@/lib/email";
import { sendOtpSms } from "@/lib/sms";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/; // E.164

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const channel = body?.channel; // 'email' | 'phone'
  const destination = body?.destination?.trim();
  const purpose = body?.purpose ?? "signup";

  if (channel !== "email" && channel !== "phone") {
    return NextResponse.json({ error: "channel must be 'email' or 'phone'" }, { status: 400 });
  }
  if (channel === "email" && destination?.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json({ error: "You can only request a code for your signed-in email address." }, { status: 403 });
  }
  if (channel === "email" && !EMAIL_RE.test(destination ?? "")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (channel === "phone" && purpose !== "phone_verify") {
    return NextResponse.json({ error: "Invalid phone verification request." }, { status: 400 });
  }
  if (channel === "phone" && !PHONE_RE.test(destination ?? "")) {
    return NextResponse.json(
      { error: "Enter a valid phone number in international format, e.g. +2348012345678." },
      { status: 400 }
    );
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
    // Rate-limit errors raised by the SQL function surface here.
    return NextResponse.json({ error: error.message }, { status: 429 });
  }

  try {
    if (channel === "email") {
      await sendOtpEmail(destination, data.code);
    } else {
      await sendOtpSms(destination, data.code);
    }
  } catch (sendError) {
    console.error("OTP send failed:", sendError);
    return NextResponse.json(
      { error: "Could not send the code. Try again shortly." },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent: true });
}
