import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSavingsReminderEmail } from "@/lib/email";

/**
 * Runs on a schedule (see vercel.json). Finds users with at least one
 * active savings goal who haven't made a transfer_to_goal in 7+ days, and
 * haven't already gotten a reminder in the last 7 days, then creates a
 * notification (and a nudge email) for each.
 *
 * Protected by CRON_SECRET so this can't be triggered by anyone who finds
 * the URL — Vercel Cron sends this automatically when configured.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Users with at least one active goal.
  const { data: activeGoalUsers } = await admin
    .from("savings_goals")
    .select("user_id")
    .eq("status", "active");

  const userIds = [...new Set((activeGoalUsers ?? []).map((g) => g.user_id))];
  if (!userIds.length) {
    return NextResponse.json({ reminded: 0 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let remindedCount = 0;

  for (const userId of userIds) {
    const [{ data: recentSave }, { data: recentReminder }, { data: profile }] = await Promise.all([
      admin
        .from("wallet_transactions")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "transfer_to_goal")
        .gt("created_at", sevenDaysAgo)
        .limit(1)
        .maybeSingle(),
      admin
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "savings_reminder")
        .gt("created_at", sevenDaysAgo)
        .limit(1)
        .maybeSingle(),
      admin.from("profiles").select("full_name").eq("id", userId).single(),
    ]);

    if (recentSave || recentReminder) continue; // saved recently, or already reminded

    await admin.from("notifications").insert({
      user_id: userId,
      type: "savings_reminder",
      title: "Keep your streak going",
      body: "It's been a week since your last deposit toward a goal — a small top-up keeps you on track.",
      link: "/dashboard/savings",
    });

    // Best-effort email nudge — a failure here shouldn't stop the loop or
    // block the in-app notification, which already succeeded.
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    if (authUser?.user?.email) {
      try {
        await sendSavingsReminderEmail(
          authUser.user.email,
          profile?.full_name?.split(" ")[0] ?? ""
        );
      } catch (emailError) {
        console.error("Reminder email failed (non-fatal):", emailError);
      }
    }

    remindedCount++;
  }

  return NextResponse.json({ reminded: remindedCount });
}
