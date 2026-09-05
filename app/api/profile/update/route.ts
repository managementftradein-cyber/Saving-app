import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : null;
  const phone = typeof body?.phone === "string" ? body.phone.trim() : null;
  const dob = typeof body?.dob === "string" ? body.dob : null;

  // Compare against the current value server-side — never trust a
  // client-supplied "did the phone change" flag.
  const { data: current } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .single();

  const phoneChanged = phone !== (current?.phone ?? null);

  // full_name/phone/date_of_birth are client-writable columns (see
  // migration_restrict_profile_column_updates.sql), so this part could
  // technically go through the regular client — but phone_verified is
  // locked down to server-only, so the whole update happens here via the
  // admin client to keep it atomic (one row write, not two).
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: fullName || null,
      phone: phone || null,
      date_of_birth: dob || null,
      ...(phoneChanged ? { phone_verified: false } : {}),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, phoneChanged });
}
