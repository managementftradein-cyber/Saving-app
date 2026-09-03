import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nairaToKobo } from "@/lib/format";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const goalId = body?.goalId;
  const amountNaira = Number(body?.amount);

  if (!goalId || !amountNaira || amountNaira <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase.rpc("withdraw_from_goal", {
    p_goal_id: goalId,
    p_amount_kobo: nairaToKobo(amountNaira),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
