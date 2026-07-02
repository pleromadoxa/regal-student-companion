import { NextResponse } from "next/server";
import { isAdminGateError, requireAdminApi } from "@/lib/admin-api";
import { hasServiceRoleAsync, createServiceClientAsync } from "@/lib/supabase/service";
import { getRuntimeEnv } from "@/lib/env";
import { paystackSecretKey } from "@/lib/paystack";

export async function GET() {
  const gate = await requireAdminApi();
  if (isAdminGateError(gate)) return gate.error;
  const { supabase } = gate;

  const checks: { name: string; status: "ok" | "warn" | "error"; detail: string }[] = [];

  const serviceRoleConfigured = await hasServiceRoleAsync();
  checks.push({
    name: "Supabase service role",
    status: serviceRoleConfigured ? "ok" : "warn",
    detail: serviceRoleConfigured
      ? "Configured (optional — admin uses session RLS)"
      : "Not set — admin panel uses authenticated session instead",
  });

  const paystackKey =
    paystackSecretKey() ?? (await getRuntimeEnv("PAYSTACK_SECRET_KEY")) ?? null;
  checks.push({
    name: "Paystack",
    status: paystackKey ? "ok" : "warn",
    detail: paystackKey ? "Secret key present" : "PAYSTACK_SECRET_KEY not set",
  });

  const tables = [
    "companion_profiles",
    "companion_subscriptions",
    "companion_app_members",
    "companion_activity_log",
  ] as const;

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    checks.push({
      name: `Table ${table}`,
      status: error ? "error" : "ok",
      detail: error ? error.message : `${count ?? 0} rows`,
    });
  }

  const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
  const { count: recent } = await supabase
    .from("companion_activity_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", fiveMinAgo);

  checks.push({
    name: "Live activity (5 min)",
    status: (recent ?? 0) > 0 ? "ok" : "warn",
    detail: `${recent ?? 0} events in last 5 minutes`,
  });

  if (serviceRoleConfigured) {
    try {
      const service = await createServiceClientAsync();
      const { error } = await service.from("companion_admins").select("id", { count: "exact", head: true });
      checks.push({
        name: "Service role connectivity",
        status: error ? "error" : "ok",
        detail: error ? error.message : "Connected",
      });
    } catch (e) {
      checks.push({
        name: "Service role connectivity",
        status: "error",
        detail: e instanceof Error ? e.message : "Failed",
      });
    }
  }

  const overall = checks.some((c) => c.status === "error")
    ? "error"
    : checks.some((c) => c.status === "warn")
      ? "warn"
      : "ok";

  return NextResponse.json({ overall, checks, checkedAt: new Date().toISOString() });
}
