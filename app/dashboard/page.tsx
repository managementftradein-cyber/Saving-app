import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKobo } from "@/lib/format";
import SignOutButton from "@/components/sign-out-button";
import NotificationBell from "@/components/notification-bell";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [{ data: profile }, { data: wallet }, { data: goals }] = await Promise.all([
    supabase.from("profiles").select("full_name, kyc_status").eq("id", user.id).single(),
    supabase.from("wallets").select("balance_kobo").eq("user_id", user.id).single(),
    supabase
      .from("savings_goals")
      .select("current_amount_kobo")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const initials = (profile?.full_name ?? user.email ?? "N E")
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const totalSavedKobo = (goals ?? []).reduce(
    (sum, g) => sum + (g.current_amount_kobo ?? 0),
    0
  );

  return (
    <main className="px-5 py-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-soft">Good to see you</p>
          <h1 className="font-display font-extrabold text-lg text-navy">
            {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="w-9 h-9 rounded-full bg-blue text-white flex items-center justify-center font-display font-bold text-xs">
            {initials}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[22px] bg-gradient-to-br from-brand-navy to-blue-deep text-white p-6">
        <p className="text-xs uppercase tracking-wide opacity-75">
          Total savings
        </p>
        <p className="font-display font-extrabold text-3xl mt-1">
          {formatKobo(totalSavedKobo)}
        </p>
        <p className="text-xs opacity-70 mt-2">
          {goals?.length
            ? `${goals.length} active goal${goals.length > 1 ? "s" : ""}`
            : "No goals yet — create one to start saving."}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-navy">Wallet balance</p>
          <p className="text-lg font-display font-extrabold text-ink mt-0.5">
            {formatKobo(wallet?.balance_kobo)}
          </p>
        </div>
        <Link href="/dashboard/wallet" className="text-xs font-semibold text-blue-deep">
          Open wallet →
        </Link>
      </div>

      <div className="mt-3 flex gap-3">
        <Link
          href="/dashboard/savings/new"
          className="flex-1 bg-sky rounded-2xl py-3 text-center text-xs font-bold text-navy"
        >
          + New goal
        </Link>
        <Link
          href="/dashboard/wallet"
          className="flex-1 bg-sky rounded-2xl py-3 text-center text-xs font-bold text-navy"
        >
          Add money
        </Link>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <p className="text-xs font-semibold text-navy">KYC status</p>
        <p className="text-sm text-ink-soft mt-1 capitalize">
          {profile?.kyc_status?.replace("_", " ") ?? "Not started"}
        </p>
      </div>

      <div className="mt-6 flex justify-center">
        <SignOutButton />
      </div>
    </main>
  );
}
