import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, kyc_status, email_verified, phone_verified, role")
    .eq("id", user.id)
    .single();

  const initials = (profile?.full_name ?? user.email ?? "N E")
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const KYC_STYLE: Record<string, string> = {
    verified: "bg-[#E9F8F0] text-success",
    pending: "bg-[#FDF3E7] text-[#8A5A1E]",
    rejected: "bg-[#FCECEB] text-[#C5453A]",
    not_started: "bg-sky text-ink-soft",
  };
  const status = profile?.kyc_status ?? "not_started";

  return (
    <main className="px-5 py-6">
      <div className="flex flex-col items-center pb-5">
        <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-blue to-blue-deep flex items-center justify-center text-white font-display font-extrabold text-2xl mb-2.5">
          {initials}
        </div>
        <p className="font-display font-extrabold text-base text-ink">
          {profile?.full_name ?? "Complete your profile"}
        </p>
        <p className="text-[11.5px] text-ink-soft mt-0.5">{user.email}</p>
        <span
          className={`mt-2.5 text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${KYC_STYLE[status]}`}
        >
          {status === "verified" ? "✓ " : ""}KYC {status.replace("_", " ")}
        </span>
      </div>

      <div className="rounded-2xl border border-line bg-white divide-y divide-line overflow-hidden mb-4">
        <Link href="/dashboard/profile/edit" className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm font-semibold text-ink">Personal information</span>
          <span className="text-ink-soft">›</span>
        </Link>
        <Link href="/dashboard/profile/security" className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm font-semibold text-ink">Security</span>
          <span className="text-ink-soft">›</span>
        </Link>
        {status !== "verified" && (
          <Link
            href="/onboarding/profile"
            className="flex items-center justify-between px-4 py-3.5"
          >
            <span className="text-sm font-semibold text-ink">Complete KYC verification</span>
            <span className="text-ink-soft">›</span>
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-white divide-y divide-line overflow-hidden mb-4">
        <Link href="/dashboard/wallet/bank-accounts" className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm font-semibold text-ink">Bank accounts</span>
          <span className="text-ink-soft">›</span>
        </Link>
        <div className="flex items-center justify-between px-4 py-3.5 opacity-50">
          <span className="text-sm font-semibold text-ink">Referral program</span>
          <span className="text-[10px] font-bold text-ink-soft">Coming soon</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 opacity-50">
          <span className="text-sm font-semibold text-ink">Rewards &amp; badges</span>
          <span className="text-[10px] font-bold text-ink-soft">Coming soon</span>
        </div>
      </div>

      {profile?.role === "admin" && (
        <Link
          href="/admin"
          className="block text-center text-xs font-bold text-blue-deep bg-sky rounded-2xl py-3 mb-4"
        >
          Open admin panel
        </Link>
      )}

      <div className="flex justify-center">
        <SignOutButton />
      </div>
    </main>
  );
}
