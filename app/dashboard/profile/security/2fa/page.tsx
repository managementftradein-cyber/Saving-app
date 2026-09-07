import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TwoFactorSetup from "./two-factor-setup";

export default async function TwoFactorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return <TwoFactorSetup />;
}
