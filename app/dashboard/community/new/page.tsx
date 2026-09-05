import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PostForm from "./post-form";

export default async function NewPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: groups } = await supabase
    .from("community_groups")
    .select("id, name")
    .order("name");

  return <PostForm groups={groups ?? []} />;
}
