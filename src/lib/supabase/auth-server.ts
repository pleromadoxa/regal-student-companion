import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CompanionProfile } from "@/types";
import type { User } from "@supabase/supabase-js";

/** One auth round-trip per RSC request (layout + pages share this). */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCompanionProfile = cache(
  async (userId: string): Promise<CompanionProfile | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("companion_profiles")
      .select(
        "id, email, display_name, avatar_url, major, year_level, engagement_points, focus_minutes, study_streak, last_active_date, created_at, updated_at"
      )
      .eq("id", userId)
      .single();
    return data as CompanionProfile | null;
  }
);

export async function requireAuthUser(): Promise<User> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}
