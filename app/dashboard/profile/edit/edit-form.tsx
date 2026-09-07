"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function EditProfileForm({
  initialFullName,
  initialPhone,
  initialDob,
  email,
}: {
  initialFullName: string;
  initialPhone: string;
  initialDob: string;
  email: string;
}) {
  const router = useRouter();

  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [dob, setDob] = useState(initialDob);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, dob }),
    });
    const data = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save changes.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <main className="px-5 py-6">
      <h1 className="font-display font-extrabold text-xl text-navy">Personal information</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-navy">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field mt-1.5"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-navy">Email</label>
          <input value={email} disabled className="input-field mt-1.5 opacity-60" />
          <p className="text-[11px] text-ink-soft mt-1">Email can't be changed here.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-navy">Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field mt-1.5"
            placeholder="+234 801 234 5678"
          />
          {phone !== initialPhone && (
            <p className="text-[11px] text-amber mt-1">
              Changing your number will require re-verification.
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-navy">Date of birth</label>
          <input
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
        {saved && !error && <p className="text-sm text-success">Saved.</p>}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Saving…" : "Save changes"}
        </button>
      </form>
    </main>
  );
}
