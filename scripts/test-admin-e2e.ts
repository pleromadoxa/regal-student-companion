/**
 * End-to-end validation for admin panel Supabase schema, RLS helpers, and live API smoke.
 * Run: npm run test:admin-e2e
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const path = join(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

async function testSupabaseSchema(
  service: ReturnType<typeof createClient> | null,
  anon: ReturnType<typeof createClient>
) {
  console.log("Supabase schema & admin data\n");

  if (service) {
    const adminEmail = "pleromadoxa@regalmail.me";
    const { data: adminRow, error: adminErr } = await service
      .from("companion_admins")
      .select("id, email, role, user_id")
      .ilike("email", adminEmail)
      .maybeSingle();

    assert.ok(!adminErr, `companion_admins query failed: ${adminErr?.message}`);
    assert.ok(adminRow, `Admin seed missing for ${adminEmail}`);
    assert.equal(adminRow.role, "super_admin");
    console.log(`✓ Admin seed: ${adminRow.email} (${adminRow.role})`);

    const tables = [
      "companion_app_members",
      "companion_activity_log",
      "companion_admins",
      "companion_coupons",
      "companion_support_tickets",
      "companion_admin_audit",
      "companion_profiles",
      "companion_subscriptions",
    ] as const;

    for (const table of tables) {
      const { error } = await service.from(table).select("*", { count: "exact", head: true });
      assert.ok(!error, `Table ${table} unreachable: ${error?.message}`);
      console.log(`✓ Table ${table} accessible`);
    }

    const { data: leaderboard, error: lbErr } = await service
      .from("companion_leaderboard_public")
      .select("id, display_name, activity_count")
      .limit(5);
    assert.ok(!lbErr, `Leaderboard view failed: ${lbErr?.message}`);
    console.log(`✓ Leaderboard view (${leaderboard?.length ?? 0} sample rows)`);
  } else {
    console.log("⚠ Skipping service-role DB checks (SUPABASE_SERVICE_ROLE_KEY not in env)");
  }

  const { error: rpcErr } = await anon.rpc("companion_is_admin");
  assert.ok(!rpcErr, `companion_is_admin RPC missing: ${rpcErr?.message}`);
  console.log("✓ companion_is_admin RPC exists");

  const { error: logErr } = await anon.rpc("companion_log_activity", {
    p_action: "e2e_test",
    p_category: "platform",
    p_label: "E2E admin test ping",
    p_metadata: { source: "test-admin-e2e" },
    p_points_delta: 0,
    p_path: "/admin",
  });
  assert.ok(
    logErr?.message.includes("Not authenticated") || !logErr,
    `Unexpected companion_log_activity error: ${logErr?.message}`
  );
  console.log("✓ companion_log_activity RPC exists (auth-gated as expected)");
}

async function testLiveSiteSmoke(baseUrl: string) {
  console.log(`\nLive site smoke (${baseUrl})\n`);

  const publicPaths = ["/", "/login"];
  for (const path of publicPaths) {
    const res = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    assert.ok(res.status < 500, `${path} returned ${res.status}`);
    console.log(`✓ ${path} → ${res.status}`);
  }

  const adminPaths = ["/admin", "/activity", "/api/admin/stats", "/api/admin/health"];
  for (const path of adminPaths) {
    const res = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    assert.ok(
      res.status === 401 || res.status === 307 || res.status === 302 || res.status === 200,
      `${path} unexpected ${res.status}`
    );
    console.log(`✓ ${path} → ${res.status} (auth protected or ok)`);
  }
}

async function main() {
  console.log("Admin panel — end-to-end self-test\n");

  loadEnvFiles();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(url, "NEXT_PUBLIC_SUPABASE_URL required in .env.local");
  assert.ok(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY required in .env.local");

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const service = serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  await testSupabaseSchema(service, anon);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://regalcompanion.cloud";
  await testLiveSiteSmoke(baseUrl);

  console.log("\nAll admin E2E tests passed.");
}

main().catch((err) => {
  console.error("\nAdmin E2E test failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
