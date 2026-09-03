"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileForm() {
  const router = useRouter();
  const supabase = createClient();

  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function saveAndContinue(startKyc: boolean) {
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      router.push("/auth/login");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        phone: phone || null,
        date_of_birth: dob || null,
        kyc_status: startKyc ? "pending" : "not_started",
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/dashboard");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveAndContinue(true);
  }

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-sm mx-auto">
      <h1 className="font-display font-extrabold text-2xl text-navy">
        Complete your profile
      </h1>
      <p className="text-sm text-ink-soft mt-2">
        Optional now — KYC verification unlocks higher savings limits and
        withdrawals later. You can finish this from your profile anytime.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="phone" className="text-xs font-semibold text-navy">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field mt-1.5"
            placeholder="+234 801 234 5678"
          />
        </div>

        <div>
          <label htmlFor="dob" className="text-xs font-semibold text-navy">
            Date of birth
          </label>
          <input
            id="dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="input-field mt-1.5"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Saving…" : "Start KYC verification"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => saveAndContinue(false)}
          className="btn-secondary"
        >
          Skip for now
        </button>
      </form>
    </main>
  );
}
