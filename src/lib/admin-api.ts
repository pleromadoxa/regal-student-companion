import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase/auth-server";
import { isCompanionAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

type AdminGate =
  | { error: NextResponse }
  | { user: User; supabase: SupabaseClient };

export async function requireAdminApi(): Promise<AdminGate> {
  const user = await getAuthUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!(await isCompanionAdmin(user))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const supabase = await createClient();
  await supabase.rpc("companion_link_admin_user");

  return { user, supabase };
}

export function isAdminGateError(gate: AdminGate): gate is { error: NextResponse } {
  return "error" in gate;
}
