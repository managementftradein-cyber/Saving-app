import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKobo } from "@/lib/format";

export default async function AdminOverviewPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/dashboard");

  // Aggregate reads across ALL users deliberately go through the
  // service-role client — RLS on wallets/savings_goals only lets a normal
  // session see its own rows, which is correct for everyone except here.
  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: verifiedUsers },
    { count: pendingKyc },
    { data: wallets },
    { data: goals },
    { count: totalPosts },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("email_verified", true),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("kyc_status", "pending"),
    admin.from("wallets").select("balance_kobo"),
    admin.from("savings_goals").select("current_amount_kobo").eq("status", "active"),
    admin.from("community_posts").select("*", { count: "exact", head: true }),
  ]);

  const totalWalletKobo = (wallets ?? []).reduce((s, w) => s + (w.balance_kobo ?? 0), 0);
  const totalSavedKobo = (goals ?? []).reduce((s, g) => s + (g.current_amount_kobo ?? 0), 0);

  const stats = [
    { label: "Total users", value: totalUsers ?? 0 },
    { label: "Email verified", value: verifiedUsers ?? 0 },
    { label: "Pending KYC", value: pendingKyc ?? 0, highlight: (pendingKyc ?? 0) > 0 },
    { label: "In wallets", value: formatKobo(totalWalletKobo) },
    { label: "In savings goals", value: formatKobo(totalSavedKobo) },
    { label: "Community posts", value: totalPosts ?? 0 },
  ];

  return (
    <div>
      <h2 className="font-display font-extrabold text-base text-navy mb-4">Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl border p-4 bg-white ${
              s.highlight ? "border-amber" : "border-line"
            }`}
          >
            <p className="text-[11px] text-ink-soft">{s.label}</p>
            <p className="font-display font-extrabold text-lg text-navy mt-1">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {(pendingKyc ?? 0) > 0 && (
        <div className="mt-5 rounded-xl bg-[#FDF3E7] border border-amber p-3 text-sm text-[#8A5A1E]">
          {pendingKyc} user{pendingKyc !== 1 ? "s" : ""} waiting on KYC review —{" "}
          <a href="/admin/users?filter=pending" className="font-bold underline">
            review now
          </a>
          .
        </div>
      )}
    </div>
  );
}
