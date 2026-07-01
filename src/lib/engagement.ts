import { createClient } from "@/lib/supabase/client";

/** Award engagement points (e.g. task complete +3, focus +10). */
export async function incrementEngagement(delta = 5): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("companion_increment_engagement", { delta });
}
