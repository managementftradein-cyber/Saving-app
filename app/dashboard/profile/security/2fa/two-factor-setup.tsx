"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; friendly_name?: string; status: string };

export default function TwoFactorSetup() {
  const supabase = createClient();

  const [factors, setFactors] = useState<Factor[]>([]);
  const [loadingFactors, setLoadingFactors] = useState(true);

  // Enrollment flow state
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadFactors() {
    setLoadingFactors(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp as Factor[]) ?? []);
    setLoadingFactors(false);
  }

  useEffect(() => {
    loadFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setError(null);
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });

    if (enrollError) {
      setError(enrollError.message);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  }

  async function confirmEnroll() {
    if (!factorId || code.length !== 6) return;
    setError(null);
    setSubmitting(true);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      setSubmitting(false);
      setError(challengeError.message);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    setSubmitting(false);

    if (verifyError) {
      setError("That code didn't work — check your authenticator app and try again.");
      return;
    }

    setEnrolling(false);
    setCode("");
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    loadFactors();
  }

  async function removeFactor(id: string) {
    setError(null);
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (unenrollError) {
      setError(unenrollError.message);
      return;
    }
    loadFactors();
  }

  const hasVerifiedFactor = factors.some((f) => f.status === "verified");

  return (
    <main className="px-5 py-6">
      <h1 className="font-display font-extrabold text-xl text-navy">Two-factor authentication</h1>
      <p className="text-sm text-ink-soft mt-1 leading-relaxed">
        Add an extra layer of protection — after your password, you&apos;ll
        also need a code from an authenticator app (like Google
        Authenticator or Authy) to log in.
      </p>

      {loadingFactors && <p className="text-sm text-ink-soft mt-6">Loading…</p>}

      {!loadingFactors && hasVerifiedFactor && !enrolling && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold text-success">✓ Two-factor authentication is on</p>
          <div className="flex flex-col gap-2 mt-3">
            {factors
              .filter((f) => f.status === "verified")
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() => removeFactor(f.id)}
                  className="text-xs font-bold text-[#C5453A] text-left"
                >
                  Remove this authenticator
                </button>
              ))}
          </div>
        </div>
      )}

      {!loadingFactors && !hasVerifiedFactor && !enrolling && (
        <button onClick={startEnroll} className="btn-primary mt-6">
          Set up two-factor authentication
        </button>
      )}

      {enrolling && qrCode && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface p-4 flex flex-col items-center">
            <p className="text-xs font-semibold text-navy mb-3">
              Scan this with your authenticator app
            </p>
            {/* Supabase returns this as inline SVG markup */}
            <div
              className="w-40 h-40"
              dangerouslySetInnerHTML={{ __html: qrCode }}
            />
            {secret && (
              <p className="text-[11px] text-ink-soft mt-3 text-center">
                Can&apos;t scan? Enter this code manually:
                <br />
                <span className="font-mono font-bold text-ink">{secret}</span>
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-navy">
              Enter the 6-digit code from your app
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="input-field mt-1.5 text-center tracking-[0.4em]"
              placeholder="000000"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={confirmEnroll}
              disabled={submitting || code.length !== 6}
              className="btn-primary flex-1"
            >
              {submitting ? "Verifying…" : "Confirm"}
            </button>
            <button
              onClick={() => {
                setEnrolling(false);
                setError(null);
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && !enrolling && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </main>
  );
}
