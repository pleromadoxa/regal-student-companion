import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-server";
import { isCompanionAdmin } from "@/lib/admin";
import { createServiceClient, hasServiceRole } from "@/lib/supabase/service";
import { paystackSecretKey } from "@/lib/paystack";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isCompanionAdmin(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const checks: { name: string; status: "ok" | "warn" | "error"; detail: string }[] = [];

  checks.push({
    name: "Supabase service role",
    status: hasServiceRole() ? "ok" : "error",
    detail: hasServiceRole() ? "Configured" : "SUPABASE_SERVICE_ROLE_KEY missing",
  });

  checks.push({
    name: "Paystack",
    status: paystackSecretKey() ? "ok" : "warn",
    detail: paystackSecretKey() ? "Secret key present" : "PAYSTACK_SECRET_KEY not set",
  });

  if (hasServiceRole()) {
    const service = createServiceClient();
    const tables = [
      "companion_profiles",
      "companion_subscriptions",
      "companion_app_members",
      "companion_activity_log",
    ] as const;

    for (const table of tables) {
      const { count, error } = await service.from(table).select("*", { count: "exact", head: true });
      checks.push({
        name: `Table ${table}`,
        status: error ? "error" : "ok",
        detail: error ? error.message : `${count ?? 0} rows`,
      });
    }

    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    const { count: recent } = await service
      .from("companion_activity_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fiveMinAgo);

    checks.push({
      name: "Live activity (5 min)",
      status: (recent ?? 0) > 0 ? "ok" : "warn",
      detail: `${recent ?? 0} events in last 5 minutes`,
    });
  }

  const overall = checks.some((c) => c.status === "error")
    ? "error"
    : checks.some((c) => c.status === "warn")
      ? "warn"
      : "ok";

  return NextResponse.json({ overall, checks, checkedAt: new Date().toISOString() });
}
