import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKobo } from "@/lib/format";

export default async function SavingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: goals } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="px-5 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-extrabold text-xl text-navy">Savings</h1>
        <Link
          href="/dashboard/savings/new"
          className="text-xs font-bold text-white bg-blue-deep rounded-full px-3.5 py-2"
        >
          + New goal
        </Link>
      </div>

      {!goals?.length && (
        <div className="mt-10 text-center">
          <p className="text-sm text-ink-soft">
            No savings goals yet. Create your first one to start putting money
            aside automatically.
          </p>
          <Link
            href="/dashboard/savings/new"
            className="btn-primary inline-block mt-4"
          >
            Create a goal
          </Link>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {goals?.map((goal) => {
          const pct = goal.target_amount_kobo
            ? Math.min(100, Math.round((goal.current_amount_kobo / goal.target_amount_kobo) * 100))
            : 0;
          return (
            <Link
              key={goal.id}
              href={`/dashboard/savings/${goal.id}`}
              className="block rounded-2xl border border-line bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <p className="font-semibold text-sm text-ink">{goal.name}</p>
                <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-sky text-blue-deep capitalize">
                  {goal.status}
                </span>
              </div>
              <div className="h-[7px] rounded-full bg-sky mt-3 mb-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue to-blue-deep"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11.5px] text-ink-soft">
                <span>
                  {formatKobo(goal.current_amount_kobo)} of{" "}
                  {formatKobo(goal.target_amount_kobo)}
                </span>
                <span>{pct}%</span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
