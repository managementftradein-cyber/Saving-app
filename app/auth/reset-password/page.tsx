"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Clicking the recovery link lands here with Supabase establishing a
    // temporary recovery session client-side. This event fires once that's
    // ready — trying to updateUser() before it fires would fail.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // If the session is already established by the time this component
    // mounts (event fired before the listener attached), check directly.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  if (success) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center max-w-sm mx-auto">
        <div className="w-14 h-14 rounded-full bg-[#E9F8F0] flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B9C63" strokeWidth="2.4">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="font-display font-extrabold text-xl text-navy">Password updated</h1>
        <p className="text-sm text-ink-soft mt-2">Taking you to your dashboard…</p>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center max-w-sm mx-auto">
        <p className="text-sm text-ink-soft">
          Verifying your reset link… if this doesn&apos;t update in a few seconds,
          the link may have expired — request a new one from the login page.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-sm mx-auto">
      <h1 className="font-display font-extrabold text-2xl text-navy">Choose a new password</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-navy">New password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mt-1.5"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-navy">Confirm password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field mt-1.5"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </main>
  );
}
