import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChangePasswordForm from "./change-password-form";

export default async function SecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div>
      <ChangePasswordForm />
      <div className="px-5 -mt-2">
        <Link
          href="/dashboard/profile/security/2fa"
          className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4"
        >
          <span className="text-sm font-semibold text-ink">Two-factor authentication</span>
          <span className="text-ink-soft">›</span>
        </Link>
      </div>
    </div>
  );
}
