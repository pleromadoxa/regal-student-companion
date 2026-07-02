import { createClient } from "@supabase/supabase-js";
import { getRuntimeEnv } from "@/lib/env";

/** Service-role client for admin operations only — never expose to the browser. */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role is not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasServiceRole(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Async check including Cloudflare Worker secret bindings. */
export async function hasServiceRoleAsync(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? (await getRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL"));
  const key = await getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY");
  return Boolean(url && key);
}

/** Service client with Cloudflare env fallback when process.env is empty. */
export async function createServiceClientAsync() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? (await getRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL"));
  const key = await getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Supabase service role is not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
