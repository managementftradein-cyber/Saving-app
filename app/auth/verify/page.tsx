"use client";

import { useState, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const initialSendFailed = searchParams.get("sendFailed") === "1";
  const initialSendError = searchParams.get("sendError");

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const [debug, setDebug] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDebug(null);
    setLoading(true);

    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: email, purpose: "signup", code }),
      });

      const data = await res.json().catch(() => ({ __parseError: true }));
      setDebug(`Status ${res.status} — ${JSON.stringify(data)}`);

      if (!res.ok) {
        setError(data.error ?? `Verification failed (${res.status}). Try again.`);
        return;
      }

      // Use a full navigation after verification so the newly-updated
      // profile/auth state is read by middleware immediately.
      window.location.assign("/onboarding/profile");
    } catch (err) {
      setDebug(`Network/JS error: ${err instanceof Error ? err.message : String(err)}`);
      setError("Something went wrong reaching the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    setResending(true);

    try {
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email", destination: email, purpose: "signup" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? `Could not resend code (${res.status}).`);
        return;
      }
      setResent(true);
    } catch {
      setError("Something went wrong reaching the server. Try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-sm mx-auto">
      <div className="w-12 h-12 rounded-full bg-sky flex items-center justify-center mb-5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B4FC4" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      </div>
      <h1 className="font-display font-extrabold text-2xl text-navy">
        Check your email
      </h1>
      <p className="text-sm text-ink-soft mt-2">
        Enter the 6-digit code we sent to{" "}
        <span className="font-semibold text-ink">{email || "your email"}</span>.
      </p>

      {initialSendFailed && (
        <div className="mt-4 rounded-xl bg-[#FCECEB] border border-[#F3C6C1] p-3">
          <p className="text-sm font-semibold text-[#C5453A]">
            The first code couldn&apos;t be sent.
          </p>
          {initialSendError && (
            <p className="text-xs text-[#C5453A]/80 mt-1">{initialSendError}</p>
          )}
          <p className="text-xs text-[#C5453A]/80 mt-1">
            Tap &quot;Resend code&quot; below to try again.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="input-field text-center text-lg tracking-[0.5em] font-semibold"
          placeholder="000000"
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {resent && !error && (
          <p className="text-sm text-success">Code resent — check your inbox.</p>
        )}

        {debug && (
          <p className="text-[10px] font-mono text-ink-soft bg-sky rounded-lg p-2 break-all">
            {debug}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="btn-primary mt-2"
        >
          {loading ? "Verifying…" : "Verify"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-blue-deep font-semibold"
        >
          {resending ? "Resending…" : "Resend code"}
        </button>
      </form>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
