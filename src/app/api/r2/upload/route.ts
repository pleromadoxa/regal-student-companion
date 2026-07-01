import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCompanionR2 } from "@/lib/cloudflare-ai";
import { assertUserStorageKey, jsonResponse, rateLimitMemory } from "@/lib/security";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const key = new URL(request.url).searchParams.get("key")?.trim();
    if (!key || key.includes("..")) return jsonResponse({ error: "Invalid key" }, 400);
    if (!assertUserStorageKey(key, user.id)) {
      return jsonResponse({ error: "Access denied" }, 403);
    }

    if (!rateLimitMemory(`r2-upload:${user.id}`, 30, 60_000)) {
      return jsonResponse({ error: "Rate limit exceeded" }, 429);
    }

    const bucket = await getCompanionR2();
    if (!bucket) return jsonResponse({ error: "R2 unavailable in this environment" }, 503);

    const contentType = request.headers.get("Content-Type") ?? "application/octet-stream";
    await bucket.put(key, request.body, {
      httpMetadata: { contentType },
    });

    const domain = process.env.REGAL_DOMAIN ?? "regalcompanion.cloud";
    const url = `https://${domain}/api/r2/object?key=${encodeURIComponent(key)}`;

    return jsonResponse({ ok: true, key, url, provider: "regal-companion-r2" });
  } catch (err) {
    console.error("[r2/upload PUT]", err);
    return jsonResponse({ error: "Upload failed" }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const key = new URL(request.url).searchParams.get("key")?.trim();
    if (!key || key.includes("..")) return jsonResponse({ error: "Invalid key" }, 400);
    if (!assertUserStorageKey(key, user.id)) {
      return jsonResponse({ error: "Access denied" }, 403);
    }

    const bucket = await getCompanionR2();
    if (!bucket) return jsonResponse({ error: "R2 unavailable in this environment" }, 503);

    await bucket.delete(key);
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("[r2/upload DELETE]", err);
    return jsonResponse({ error: "Delete failed" }, 500);
  }
}
