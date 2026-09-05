import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditProfileForm from "./edit-form";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, date_of_birth")
    .eq("id", user.id)
    .single();

  return (
    <EditProfileForm
      initialFullName={profile?.full_name ?? ""}
      initialPhone={profile?.phone ?? ""}
      initialDob={profile?.date_of_birth ?? ""}
      email={user.email ?? ""}
    />
  );
}
