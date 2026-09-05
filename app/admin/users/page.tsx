import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireAdminUser();
  if (!user) redirect("/dashboard");

  const { filter } = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select("id, full_name, kyc_status, email_verified, phone_verified, created_at")
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.eq("kyc_status", "pending");
  }

  const { data: users } = await query;

  const STATUS_STYLE: Record<string, string> = {
    verified: "bg-[#E9F8F0] text-success",
    pending: "bg-[#FDF3E7] text-[#8A5A1E]",
    rejected: "bg-[#FCECEB] text-[#C5453A]",
    not_started: "bg-sky text-ink-soft",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-extrabold text-base text-navy">
          Users {filter === "pending" && "— pending KYC"}
        </h2>
        {filter === "pending" && (
          <Link href="/admin/users" className="text-xs font-bold text-blue-deep">
            Show all
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-white divide-y divide-line overflow-hidden">
        {users?.map((u) => (
          <Link
            key={u.id}
            href={`/admin/users/${u.id}`}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-ink">{u.full_name ?? "Unnamed"}</p>
              <p className="text-[11px] text-ink-soft mt-0.5">
                Joined {new Date(u.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                {!u.email_verified && " · email unverified"}
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${
                STATUS_STYLE[u.kyc_status] ?? STATUS_STYLE.not_started
              }`}
            >
              {u.kyc_status.replace("_", " ")}
            </span>
          </Link>
        ))}
        {!users?.length && (
          <p className="text-sm text-ink-soft text-center py-6">No users found.</p>
        )}
      </div>
    </div>
  );
}
