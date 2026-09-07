"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function MfaChallengeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFactor, setLoadingFactor] = useState(true);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp?.find((f) => f.status === "verified");
      setFactorId(verified?.id ?? null);
      setLoadingFactor(false);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!factorId) {
      setError("No authenticator found on this account.");
      return;
    }

    setLoading(true);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    setLoading(false);

    if (verifyError) {
      setError("That code didn't work — check your app and try again.");
      return;
    }

    router.push(searchParams.get("next") ?? "/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-sm mx-auto">
      <div className="w-12 h-12 rounded-full bg-sky flex items-center justify-center mb-5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B4FC4" strokeWidth="2">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 018 0v4" />
        </svg>
      </div>
      <h1 className="font-display font-extrabold text-2xl text-navy">
        Two-factor verification
      </h1>
      <p className="text-sm text-ink-soft mt-2">
        Enter the 6-digit code from your authenticator app.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="input-field text-center text-lg tracking-[0.5em] font-semibold"
          placeholder="000000"
          autoFocus
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || loadingFactor || code.length !== 6}
          className="btn-primary mt-2"
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>
    </main>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense fallback={null}>
      <MfaChallengeForm />
    </Suspense>
  );
}
