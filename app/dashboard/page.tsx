import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, kyc_status")
    .eq("id", user.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const initials = (profile?.full_name ?? user.email ?? "N E")
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen max-w-sm mx-auto px-5 py-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-soft">Good to see you</p>
          <h1 className="font-display font-extrabold text-lg text-navy">
            {firstName}
          </h1>
        </div>
        <div className="w-9 h-9 rounded-full bg-blue text-white flex items-center justify-center font-display font-bold text-xs">
          {initials}
        </div>
      </div>

      <div className="mt-6 rounded-[22px] bg-gradient-to-br from-navy to-blue-deep text-white p-6">
        <p className="text-xs uppercase tracking-wide opacity-75">
          Total savings
        </p>
        <p className="font-display font-extrabold text-3xl mt-1">₦0.00</p>
        <p className="text-xs opacity-70 mt-2">
          No goals yet — create one to start saving.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-white p-4">
        <p className="text-xs font-semibold text-navy">KYC status</p>
        <p className="text-sm text-ink-soft mt-1 capitalize">
          {profile?.kyc_status?.replace("_", " ") ?? "Not started"}
        </p>
      </div>

      <p className="text-xs text-ink-soft mt-8 text-center">
        Savings goals, wallet, and community are next up.
      </p>

      <div className="mt-4 flex justify-center">
        <SignOutButton />
      </div>
    </main>
  );
}
