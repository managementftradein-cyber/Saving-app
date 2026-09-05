"use client";

import { useState, type FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(
        signInError.message === "Email not confirmed"
          ? "Verify your email first."
          : "That email and password don't match."
      );
      return;
    }

    window.location.replace(searchParams.get("next") ?? "/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-sm mx-auto">
      <h1 className="font-display font-extrabold text-2xl text-navy">
        Welcome back
      </h1>
      <p className="text-sm text-ink-soft mt-2">Log in to your Nestegg account.</p>

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

        <div>
          <label htmlFor="password" className="text-xs font-semibold text-navy">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mt-1.5"
            placeholder="Your password"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-sm text-ink-soft text-center mt-6">
        New to Nestegg?{" "}
        <Link href="/auth/signup" className="text-blue-deep font-semibold">
          Sign up
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
