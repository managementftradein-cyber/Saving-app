"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);

    // Always show the same success state regardless of whether the email
    // exists — confirming/denying an account's existence here would leak
    // which emails are registered.
    if (resetError) {
      console.error("resetPasswordForEmail failed:", resetError.message);
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-sm mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-sky flex items-center justify-center mb-5 mx-auto">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B4FC4" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <h1 className="font-display font-extrabold text-xl text-navy">Check your email</h1>
        <p className="text-sm text-ink-soft mt-2">
          If an account exists for {email}, a password reset link is on its way.
        </p>
        <Link href="/auth/login" className="btn-secondary mt-8">
          Back to login
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-sm mx-auto">
      <h1 className="font-display font-extrabold text-2xl text-navy">Reset your password</h1>
      <p className="text-sm text-ink-soft mt-2">
        Enter your email and we&apos;ll send a link to reset it.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="text-xs font-semibold text-navy">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field mt-1.5"
            placeholder="you@email.com"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="text-sm text-ink-soft text-center mt-6">
        <Link href="/auth/login" className="text-blue-deep font-semibold">
          Back to login
        </Link>
      </p>
    </main>
  );
}
