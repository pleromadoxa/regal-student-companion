import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCompanionR2 } from "@/lib/cloudflare-ai";
import {
  assertUserStorageKey,
  jsonResponse,
  rateLimitMemory,
  withSecurityHeaders,
} from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const key = new URL(request.url).searchParams.get("key")?.trim();
    if (!key || key.includes("..") || !key.startsWith("users/")) {
      return jsonResponse({ error: "Invalid key" }, 400);
    }

    const userId = key.match(/^users\/([^/]+)\//)?.[1];
    if (!userId) return jsonResponse({ error: "Invalid key" }, 400);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
    if (!assertUserStorageKey(key, user.id)) {
      return jsonResponse({ error: "Access denied" }, 403);
    }

    if (!rateLimitMemory(`r2-object:${user.id}`, 60, 60_000)) {
      return jsonResponse({ error: "Rate limit exceeded" }, 429);
    }

    const bucket = await getCompanionR2();
    if (!bucket) return jsonResponse({ error: "R2 unavailable" }, 503);

    const object = await bucket.get(key);
    if (!object) return jsonResponse({ error: "Not found" }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "private, max-age=3600");

    return withSecurityHeaders(new Response(object.body, { headers }));
  } catch (err) {
    console.error("[r2/object GET]", err);
    return jsonResponse({ error: "Failed to load file" }, 500);
  }
}
