import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GoalForm from "./goal-form";

export default async function NewGoalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return <GoalForm />;
}
