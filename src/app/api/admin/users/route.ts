import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-server";
import { isCompanionAdmin } from "@/lib/admin";
import { createServiceClient, hasServiceRole } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isCompanionAdmin(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasServiceRole()) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const service = createServiceClient();

  let query = service
    .from("companion_profiles")
    .select(
      "id, email, display_name, avatar_url, engagement_points, focus_minutes, study_streak, created_at, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(50);

  if (q) {
    query = query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`);
  }

  const { data: profiles, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (profiles ?? []).map((p) => p.id);
  const [{ data: subs }, { data: members }] = await Promise.all([
    ids.length
      ? service.from("companion_subscriptions").select("*").in("user_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? service.from("companion_app_members").select("*").in("user_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const subMap = new Map((subs ?? []).map((s) => [s.user_id, s]));
  const memberMap = new Map((members ?? []).map((m) => [m.user_id, m]));

  const users = (profiles ?? []).map((p) => ({
    ...p,
    subscription: subMap.get(p.id) ?? null,
    appMember: memberMap.get(p.id) ?? null,
    isCompanionUser: Boolean(memberMap.get(p.id)),
  }));

  return NextResponse.json({ users });
}
