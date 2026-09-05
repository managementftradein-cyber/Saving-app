import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

export async function POST(request: NextRequest) {
  // Authenticate with the user's Supabase session first. The service-role
  // client is only used after this check so RLS cannot block a legitimate
  // server-side onboarding write.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Please log in again." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const dob = typeof body?.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";
  const startKyc = Boolean(body?.startKyc);
  const phoneVerified = Boolean(body?.phoneVerified);

  if (phone && !PHONE_RE.test(phone)) {
    return NextResponse.json(
      { error: "Use an international phone format, e.g. +2348012345678." },
      { status: 400 }
    );
  }

  if (dob && !DATE_RE.test(dob)) {
    return NextResponse.json({ error: "Enter a valid date of birth." }, { status: 400 });
  }

  if (phone && !phoneVerified) {
    return NextResponse.json(
      { error: "Please verify your phone number or remove it before continuing." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Read the current KYC state so onboarding can never downgrade an already
  // verified customer back to pending/not_started.
  const { data: existing, error: readError } = await admin
    .from("profiles")
    .select("kyc_status")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("profile read during onboarding failed:", readError);
    return NextResponse.json(
      { error: "We could not load your profile. Please try again." },
      { status: 500 }
    );
  }

  const kycStatus = existing?.kyc_status === "verified"
    ? "verified"
    : startKyc
      ? "pending"
      : "not_started";

  const { error: writeError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      phone: phone || null,
      date_of_birth: dob || null,
      kyc_status: kycStatus,
      onboarding_completed_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (writeError) {
    console.error("profile write during onboarding failed:", writeError);
    return NextResponse.json(
      { error: "We could not save your profile. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
