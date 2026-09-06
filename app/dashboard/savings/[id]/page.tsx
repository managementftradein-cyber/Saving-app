import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKobo } from "@/lib/format";
import GoalActions from "./goal-actions";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: goal } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!goal) notFound();

  const pct = goal.target_amount_kobo
    ? Math.min(100, Math.round((goal.current_amount_kobo / goal.target_amount_kobo) * 100))
    : 0;

  return (
    <main className="px-5 py-6">
      <h1 className="font-display font-extrabold text-xl text-navy">{goal.name}</h1>
      <span className="inline-block mt-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-sky text-blue-deep capitalize">
        {goal.status}
      </span>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <div className="h-[8px] rounded-full bg-sky mb-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue to-blue-deep"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-ink-soft">
          <span>
            {formatKobo(goal.current_amount_kobo)} of {formatKobo(goal.target_amount_kobo)}
          </span>
          <span>{pct}%</span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-xs">
          <dt className="text-ink-soft">Auto-save</dt>
          <dd className="text-right font-semibold capitalize">{goal.auto_save_frequency}</dd>
          <dt className="text-ink-soft">Duration</dt>
          <dd className="text-right font-semibold">
            {goal.duration_months ? `${goal.duration_months} months` : "—"}
          </dd>
          <dt className="text-ink-soft">Lock period</dt>
          <dd className="text-right font-semibold">
            {goal.lock_period_days > 0 ? `${goal.lock_period_days} days` : "None"}
          </dd>
        </dl>
      </div>

      <GoalActions goalId={goal.id} currentAmountKobo={goal.current_amount_kobo} />
    </main>
  );
}
