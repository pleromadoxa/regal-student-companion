import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCompanionR2 } from "@/lib/cloudflare-ai";
import {
  assertUserStorageKey,
  clientIp,
  jsonResponse,
  rateLimitMemory,
  syncStorageKey,
} from "@/lib/security";
import {
  CLOUD_SYNC_GLOBAL_KEYS,
  CLOUD_SYNC_KEY_SUFFIXES,
  isValidSyncBundle,
  type CloudSyncBundle,
} from "@/lib/cloud-sync";
import { checkFeatureAccess } from "@/lib/subscription";

function collectKeysForUser(userId: string): string[] {
  const keys = CLOUD_SYNC_KEY_SUFFIXES.map((s) => `${s}-${userId}`);
  return [...keys, ...CLOUD_SYNC_GLOBAL_KEYS];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    if (!rateLimitMemory(`cloud-sync-get:${user.id}`, 30, 60_000)) {
      return jsonResponse({ error: "Rate limit exceeded" }, 429);
    }

    const gate = await checkFeatureAccess(supabase, user.id, "cloudSync");
    if (!gate.ok) {
      return jsonResponse(
        { error: gate.error, upgradeRequired: gate.upgradeRequired },
        403
      );
    }

    const bucket = await getCompanionR2();
    if (!bucket) {
      return jsonResponse({ error: "Cloud storage unavailable in this environment" }, 503);
    }

    const object = await bucket.get(syncStorageKey(user.id));
    if (!object) {
      return jsonResponse({ ok: true, bundle: null, updatedAt: null });
    }

    const raw = await object.json().catch(() => null);
    if (!isValidSyncBundle(raw)) {
      return jsonResponse({ error: "Cloud backup is corrupted — push a fresh backup" }, 422);
    }

    const bundle = raw as CloudSyncBundle;
    return jsonResponse({ ok: true, bundle, updatedAt: bundle.updatedAt ?? null });
  } catch (err) {
    console.error("[cloud/sync GET]", err);
    return jsonResponse({ error: "Cloud sync failed" }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    if (!rateLimitMemory(`cloud-sync:${user.id}`, 20, 60_000)) {
      return jsonResponse({ error: "Rate limit exceeded" }, 429);
    }

    const gate = await checkFeatureAccess(supabase, user.id, "cloudSync");
    if (!gate.ok) {
      return jsonResponse(
        { error: gate.error, upgradeRequired: gate.upgradeRequired },
        403
      );
    }

    const bucket = await getCompanionR2();
    if (!bucket) {
      return jsonResponse({ error: "Cloud storage unavailable in this environment" }, 503);
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      bundle?: CloudSyncBundle;
    };
    const action = body.action === "push" ? "push" : "merge";

    if (!isValidSyncBundle(body.bundle)) {
      return jsonResponse({ error: "Missing or invalid sync bundle" }, 400);
    }

    const incoming = body.bundle as CloudSyncBundle;

    if (action === "push") {
      await bucket.put(syncStorageKey(user.id), JSON.stringify(incoming), {
        httpMetadata: { contentType: "application/json" },
      });
      return jsonResponse({ ok: true, keys: Object.keys(incoming.entries ?? {}).length });
    }

    const existing = await bucket.get(syncStorageKey(user.id));
    const priorRaw = existing ? await existing.json().catch(() => null) : null;
    const prior = isValidSyncBundle(priorRaw) ? (priorRaw as CloudSyncBundle) : null;

    const merged: CloudSyncBundle = {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: { ...(prior?.entries ?? {}), ...incoming.entries },
    };

    await bucket.put(syncStorageKey(user.id), JSON.stringify(merged), {
      httpMetadata: { contentType: "application/json" },
    });

    return jsonResponse({
      ok: true,
      keys: Object.keys(merged.entries).length,
      syncedKeys: collectKeysForUser(user.id).filter((k) => k in merged.entries),
      ip: clientIp(request),
    });
  } catch (err) {
    console.error("[cloud/sync POST]", err);
    return jsonResponse({ error: "Cloud sync failed" }, 500);
  }
}
