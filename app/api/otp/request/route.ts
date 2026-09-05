import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOtpEmail } from "@/lib/email";
import { sendOtpSms } from "@/lib/sms";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/; // E.164

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const channel = body?.channel; // 'email' | 'phone'
  const destination = typeof body?.destination === "string" ? body.destination.trim() : "";
  const purpose = body?.purpose ?? "signup";
  const userId = typeof body?.userId === "string" ? body.userId : null;

  if (channel !== "email" && channel !== "phone") {
    return NextResponse.json({ error: "channel must be 'email' or 'phone'" }, { status: 400 });
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

  const admin = createAdminClient();

  // Signup OTPs must belong to the Auth user that was just created.
  // Supabase JS does not expose getUserByEmail(); use getUserById() and
  // verify that the destination actually belongs to that user.
  let verifiedUserId = userId;

  if (purpose === "signup") {
    if (!userId) {
      return NextResponse.json({ error: "Missing user ID for signup verification." }, { status: 400 });
    }

    const { data: authUserData, error: authLookupError } =
      await admin.auth.admin.getUserById(userId);

    if (authLookupError || !authUserData.user) {
      console.error("Auth user lookup failed:", authLookupError);
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const authUser = authUserData.user;
    const matchesDestination =
      channel === "email"
        ? (authUser.email ?? "").trim().toLowerCase() === destination.toLowerCase()
        : (authUser.phone ?? "").trim() === destination;

    if (!matchesDestination) {
      return NextResponse.json(
        { error: "Verification destination does not match the account." },
        { status: 400 }
      );
    }

    verifiedUserId = authUser.id;
  }

  const { data, error } = await admin
    .rpc("request_otp", {
      p_user_id: verifiedUserId,
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
