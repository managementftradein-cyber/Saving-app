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

  // Phone OTP sub-flow
  const [phoneStage, setPhoneStage] = useState<"idle" | "code_sent" | "verified">("idle");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const PHONE_RE = /^\+[1-9]\d{7,14}$/;

  async function sendPhoneCode() {
    setPhoneError(null);
    if (!PHONE_RE.test(phone)) {
      setPhoneError("Use international format, e.g. +2348012345678.");
      return;
    }

    setPhoneLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const res = await fetch("/api/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "phone",
        destination: phone,
        purpose: "phone_verify",
      }),
    });
    const data = await res.json();
    setPhoneLoading(false);

    if (!res.ok) {
      setPhoneError(data.error ?? "Could not send code.");
      return;
    }
    setPhoneStage("code_sent");
  }

  async function verifyPhoneCode() {
    setPhoneError(null);
    setPhoneLoading(true);

    const res = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination: phone, purpose: "phone_verify", code: phoneCode }),
    });
    const data = await res.json();
    setPhoneLoading(false);

    if (!res.ok) {
      setPhoneError(data.error ?? "That code didn't work.");
      return;
    }
    setPhoneStage("verified");
  }

  async function saveAndContinue(startKyc: boolean) {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          dateOfBirth: dob,
          startKyc,
          phoneVerified: phoneStage === "verified" || !phone,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "We could not save your profile. Please try again.");
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError("Something went wrong saving your profile. Please try again.");
    } finally {
      setLoading(false);
    }
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
          <div className="flex gap-2 mt-1.5">
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneStage("idle");
              }}
              className="input-field flex-1"
              placeholder="+234 801 234 5678"
              disabled={phoneStage === "verified"}
            />
            {phoneStage !== "verified" && (
              <button
                type="button"
                onClick={sendPhoneCode}
                disabled={phoneLoading || !phone}
                className="text-xs font-bold text-blue-deep whitespace-nowrap px-2"
              >
                {phoneStage === "code_sent"
                  ? "Resend"
                  : phoneLoading
                    ? "Sending…"
                    : "Verify"}
              </button>
            )}
          </div>

          {phoneStage === "verified" && (
            <p className="text-xs text-success mt-1.5 font-semibold">✓ Phone verified</p>
          )}

          {phoneStage === "code_sent" && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))}
                className="input-field flex-1 text-center tracking-[0.4em]"
                placeholder="000000"
              />
              <button
                type="button"
                onClick={verifyPhoneCode}
                disabled={phoneLoading || phoneCode.length !== 6}
                className="text-xs font-bold text-white bg-blue-deep rounded-xl px-4"
              >
                Confirm
              </button>
            </div>
          )}

          {phoneError && <p className="text-xs text-red-600 mt-1.5">{phoneError}</p>}
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
