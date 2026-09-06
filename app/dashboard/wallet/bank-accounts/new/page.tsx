import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddBankForm from "./add-bank-form";

export default async function NewBankAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return <AddBankForm />;
}
