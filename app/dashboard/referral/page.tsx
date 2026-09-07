import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKobo } from "@/lib/format";
import CopyReferralLink from "./copy-referral-link";

export default async function ReferralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: rewards }] = await Promise.all([
    supabase.from("profiles").select("referral_code").eq("id", user.id).single(),
    supabase
      .from("referral_rewards")
      .select("reward_kobo, created_at, referred_id, profiles!referral_rewards_referred_id_fkey(full_name)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const totalEarnedKobo = (rewards ?? []).reduce((s, r) => s + r.reward_kobo, 0);

  return (
    <main className="px-5 py-6">
      <h1 className="font-display font-extrabold text-xl text-navy">Referral program</h1>
      <p className="text-sm text-ink-soft mt-1">
        Earn ₦500 for every friend who signs up and makes their first deposit.
      </p>

      <div className="mt-5 rounded-[22px] bg-gradient-to-br from-blue to-blue-deep text-white p-5">
        <p className="text-xs opacity-80">Your referral code</p>
        <p className="font-display font-extrabold text-2xl mt-1 tracking-wider">
          {profile?.referral_code}
        </p>
        <div className="mt-4">
          <CopyReferralLink referralCode={profile?.referral_code ?? ""} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-navy">Total earned</p>
          <p className="text-lg font-display font-extrabold text-ink mt-0.5">
            {formatKobo(totalEarnedKobo)}
          </p>
        </div>
        <p className="text-xs text-ink-soft">{rewards?.length ?? 0} referrals</p>
      </div>

      <div className="mt-6">
        <h2 className="font-display font-extrabold text-sm text-navy mb-2.5">
          Referral history
        </h2>
        {!rewards?.length && (
          <p className="text-sm text-ink-soft text-center py-6">
            No referrals yet — share your code to start earning.
          </p>
        )}
        <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
          {rewards?.map((r, i) => {
            const referred = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            return (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">
                    {referred?.full_name ?? "A new user"}
                  </p>
                  <p className="text-[11px] text-ink-soft mt-0.5">
                    {new Date(r.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                  </p>
                </div>
                <span className="text-[13px] font-bold text-success">
                  +{formatKobo(r.reward_kobo)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
