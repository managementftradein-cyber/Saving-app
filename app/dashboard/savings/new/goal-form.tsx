"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { nairaToKobo } from "@/lib/format";

export default function GoalForm() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [duration, setDuration] = useState("6");
  const [frequency, setFrequency] = useState("weekly");
  const [lockDays, setLockDays] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const targetNaira = Number(target);
    if (!name.trim() || !targetNaira || targetNaira <= 0) {
      setError("Enter a goal name and a target amount greater than ₦0.");
      return;
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      router.push("/auth/login");
      return;
    }

    const { error: insertError } = await supabase.from("savings_goals").insert({
      user_id: user.id,
      name: name.trim(),
      target_amount_kobo: nairaToKobo(targetNaira),
      duration_months: Number(duration) || null,
      auto_save_frequency: frequency,
      lock_period_days: Number(lockDays) || 0,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/dashboard/savings");
    router.refresh();
  }

  return (
    <main className="px-5 py-6">
      <h1 className="font-display font-extrabold text-xl text-navy">New savings goal</h1>
      <p className="text-sm text-ink-soft mt-1">
        Give it a name, a target, and how often you want to save.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-navy">Goal name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field mt-1.5"
            placeholder="e.g. Rent — 2027"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-navy">Target amount (₦)</label>
          <input
            required
            type="number"
            min="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="input-field mt-1.5"
            placeholder="1000000"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-navy">Duration (months)</label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="input-field mt-1.5"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-navy">Auto-save</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="input-field mt-1.5"
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-navy">
            Lock period (days, optional)
          </label>
          <input
            type="number"
            min="0"
            value={lockDays}
            onChange={(e) => setLockDays(e.target.value)}
            className="input-field mt-1.5"
            placeholder="0"
          />
          <p className="text-[11px] text-ink-soft mt-1">
            Withdrawing before this many days pass applies a 5% early-withdrawal
            penalty.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Creating…" : "Create goal"}
        </button>
      </form>
    </main>
  );
}
