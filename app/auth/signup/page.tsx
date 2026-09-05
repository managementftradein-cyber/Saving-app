"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    // Request our own OTP (sent via Resend) rather than relying on
    // Supabase's built-in confirmation email — this project's Supabase
    // project must have "Confirm email" turned OFF so signUp() returns an
    // active session immediately; the middleware then gates protected
    // routes on profiles.email_verified until this code is confirmed.
    const otpRes = await fetch("/api/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "email",
        destination: email,
        purpose: "signup",
      }),
    });

    setLoading(false);

    const query = new URLSearchParams({ email });

    if (!otpRes.ok) {
      // Don't swallow this — the account exists either way, but the person
      // needs to know the first code didn't go out so they hit Resend
      // instead of waiting on an email that's never coming.
      const data = await otpRes.json().catch(() => ({}));
      query.set("sendFailed", "1");
      query.set("sendError", data.error ?? "Could not send the code.");
    }

    router.push(`/auth/verify?${query.toString()}`);
  }

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-sm mx-auto">
      <h1 className="font-display font-extrabold text-2xl text-navy">
        Create your account
      </h1>
      <p className="text-sm text-ink-soft mt-2">
        Takes about a minute. You&apos;ll verify your email next.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="fullName" className="text-xs font-semibold text-navy">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field mt-1.5"
            placeholder="Amaka Johnson"
          />
        </div>

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

        <div>
          <label htmlFor="password" className="text-xs font-semibold text-navy">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mt-1.5"
            placeholder="At least 8 characters"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="text-sm text-ink-soft text-center mt-6">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-blue-deep font-semibold">
          Log in
        </Link>
      </p>
    </main>
  );
}
