import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const res = await fetch("https://api.paystack.co/bank?currency=NGN", {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    // Bank list changes rarely — safe to cache for a day.
    next: { revalidate: 86400 },
  });
  const data = await res.json();

  if (!res.ok || !data?.status) {
    return NextResponse.json({ error: "Could not load bank list" }, { status: 502 });
  }

  const banks = (data.data as { name: string; code: string }[]).map((b) => ({
    name: b.name,
    code: b.code,
  }));

  return NextResponse.json({ banks });
}
