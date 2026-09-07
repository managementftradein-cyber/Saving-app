import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import KycForm from "./kyc-form";

export default async function KycPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("kyc_status, bvn_verified")
    .eq("id", user.id)
    .single();

  if (profile?.kyc_status === "verified") {
    return (
      <main className="px-5 py-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-14 h-14 rounded-full bg-[#E9F8F0] flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B9C63" strokeWidth="2.4">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="font-display font-extrabold text-lg text-navy">You&apos;re verified</h1>
        <p className="text-sm text-ink-soft mt-2">
          Your identity has been confirmed. Deposit and withdrawal limits are lifted.
        </p>
      </main>
    );
  }

  return <KycForm />;
}
