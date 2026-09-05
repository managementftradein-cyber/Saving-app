import { notFound, redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKobo } from "@/lib/format";
import KycActions from "./kyc-actions";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const admin_user = await requireAdminUser();
  if (!admin_user) redirect("/dashboard");

  const { userId } = await params;
  const admin = createAdminClient();

  const [{ data: profile }, { data: wallet }, { data: goals }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).single(),
    admin.from("wallets").select("balance_kobo").eq("user_id", userId).single(),
    admin.from("savings_goals").select("*").eq("user_id", userId),
  ]);

  if (!profile) notFound();

  return (
    <div>
      <h2 className="font-display font-extrabold text-base text-navy mb-1">
        {profile.full_name ?? "Unnamed user"}
      </h2>
      <p className="text-xs text-ink-soft mb-5">
        Joined {new Date(profile.created_at).toLocaleDateString("en-NG", { dateStyle: "long" })}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl border border-line bg-white p-3">
          <p className="text-[11px] text-ink-soft">Wallet balance</p>
          <p className="font-bold text-sm mt-1">{formatKobo(wallet?.balance_kobo)}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3">
          <p className="text-[11px] text-ink-soft">Active goals</p>
          <p className="font-bold text-sm mt-1">
            {goals?.filter((g) => g.status === "active").length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3">
          <p className="text-[11px] text-ink-soft">Email</p>
          <p className="font-bold text-sm mt-1">{profile.email_verified ? "Verified" : "Unverified"}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3">
          <p className="text-[11px] text-ink-soft">Phone</p>
          <p className="font-bold text-sm mt-1">{profile.phone ?? "—"}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="text-xs font-bold text-navy mb-1">KYC status</p>
        <p className="text-sm text-ink-soft mb-3 capitalize">
          {profile.kyc_status.replace("_", " ")}
        </p>
        <KycActions userId={userId} currentStatus={profile.kyc_status} />
      </div>

      {!!goals?.length && (
        <div className="mt-5">
          <p className="text-xs font-bold text-navy mb-2">Savings goals</p>
          <div className="rounded-2xl border border-line bg-white divide-y divide-line">
            {goals.map((g) => (
              <div key={g.id} className="flex justify-between px-4 py-2.5 text-[13px]">
                <span>{g.name}</span>
                <span className="text-ink-soft">
                  {formatKobo(g.current_amount_kobo)} / {formatKobo(g.target_amount_kobo)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
