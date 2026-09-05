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
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const dateOfBirth = typeof body?.dateOfBirth === "string" ? body.dateOfBirth : "";
  const startKyc = body?.startKyc === true;

  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json({ error: "Use international phone format, e.g. +2348012345678." }, { status: 400 });
  }
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return NextResponse.json({ error: "Enter a valid date of birth." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").upsert({
    id: user.id,
    full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    phone: phone || null,
    date_of_birth: dateOfBirth || null,
    kyc_status: startKyc ? "pending" : "not_started",
    onboarding_completed_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (error) {
    console.error("Onboarding profile save failed:", error.message);
    return NextResponse.json({ error: "We couldn't save your profile. Please try again." }, { status: 500 });
  }

  const { error: walletError } = await admin.from("wallets").upsert(
    { user_id: user.id, balance_kobo: 0 },
    { onConflict: "user_id" }
  );

  if (walletError) console.error("Wallet repair failed:", walletError.message);

  return NextResponse.json({ success: true });
}
