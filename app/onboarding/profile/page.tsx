import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export default async function OnboardingProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, date_of_birth, onboarding_completed_at, email_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.email_verified) {
    redirect(`/auth/verify?email=${encodeURIComponent(user.email ?? "")}`);
  }

  if (profile.onboarding_completed_at) {
    redirect("/dashboard");
  }

  return <ProfileForm initialPhone={profile.phone ?? ""} initialDob={profile.date_of_birth ?? ""} />;
}
