"use client";

import { useState } from "react";

export default function CopyReferralLink({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/signup?ref=${referralCode}`
        : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in some contexts — fail silently, the code
      // is still visible on screen to copy manually.
    }
  }

  return (
    <button
      onClick={copy}
      className="w-full bg-white/16 rounded-xl py-2.5 text-sm font-bold"
    >
      {copied ? "Copied!" : "Copy invite link"}
    </button>
  );
}
