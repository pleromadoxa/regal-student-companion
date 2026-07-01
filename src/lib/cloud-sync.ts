import { parseJsonResponse } from "@/lib/api-fetch";
import { readLocalJson, syncMetaKey, writeLocalJson } from "@/lib/safe-storage";

/** localStorage keys synced to Cloudflare R2 per user. */
export const CLOUD_SYNC_KEY_SUFFIXES = [
  "regal-cv-profile",
  "regal-cv-entries",
  "regal-user-courses",
  "regal-course-subjects",
  "regal-subject-materials",
  "regal-mentor",
  "regal-war-plans",
  "regal-war-plan-content",
  "regal-war-room-v2",
  "regal-research-drafts",
  "regal-math-history",
  "regal-quiz-history",
  "regal-bibliography",
  "regal-mindmap-library",
  "regal-resume-form",
  "regal-resume-versions",
  "regal-study-planner-history",
  "regal-plagiarism-history",
  "regal-grade-calculator",
  "regal-budget-targets",
  "regal-exam-checklist",
  "regal-streaks",
] as const;

export const CLOUD_SYNC_GLOBAL_KEYS = ["regal-essay-planner-draft"] as const;

export type CloudSyncBundle = {
  version: 1;
  updatedAt: string;
  entries: Record<string, string>;
};

export function isValidSyncBundle(value: unknown): value is CloudSyncBundle {
  if (!value || typeof value !== "object") return false;
  const b = value as CloudSyncBundle;
  return b.version === 1 && typeof b.updatedAt === "string" && b.entries != null;
}

export function collectLocalSyncData(userId: string): CloudSyncBundle {
  const entries: Record<string, string> = {};

  if (typeof window === "undefined") {
    return { version: 1, updatedAt: new Date().toISOString(), entries };
  }

  for (const suffix of CLOUD_SYNC_KEY_SUFFIXES) {
    const key = `${suffix}-${userId}`;
    const value = localStorage.getItem(key);
    if (value != null) entries[key] = value;
  }

  for (const key of CLOUD_SYNC_GLOBAL_KEYS) {
    const value = localStorage.getItem(key);
    if (value != null) entries[key] = value;
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries,
  };
}

export function applyCloudSyncBundle(bundle: CloudSyncBundle, userId?: string): number {
  if (typeof window === "undefined" || !bundle?.entries) return 0;

  if (userId) {
    const metaKey = syncMetaKey(userId);
    const localUpdated = localStorage.getItem(metaKey);
    if (localUpdated && bundle.updatedAt && bundle.updatedAt < localUpdated) {
      return 0;
    }
  }

  let applied = 0;
  for (const [key, value] of Object.entries(bundle.entries)) {
    if (typeof value !== "string") continue;
    try {
      localStorage.setItem(key, value);
      applied += 1;
    } catch {
      /* quota */
    }
  }

  if (userId && bundle.updatedAt) {
    try {
      localStorage.setItem(syncMetaKey(userId), bundle.updatedAt);
    } catch {
      /* quota */
    }
  }

  return applied;
}

export async function pushCloudSync(
  userId: string
): Promise<{ ok: boolean; keys: number; error?: string }> {
  try {
    const bundle = collectLocalSyncData(userId);
    const res = await fetch("/api/cloud/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "push", bundle }),
    });
    const data = await parseJsonResponse<{ error?: string; keys?: number; upgradeRequired?: boolean }>(res);
    if (!res.ok) {
      return { ok: false, keys: 0, error: data.error ?? "Sync failed" };
    }
    try {
      localStorage.setItem(syncMetaKey(userId), bundle.updatedAt);
    } catch {
      /* quota */
    }
    return { ok: true, keys: data.keys ?? 0 };
  } catch (e) {
    return {
      ok: false,
      keys: 0,
      error: e instanceof Error ? e.message : "Sync failed",
    };
  }
}

export async function pullCloudSync(userId: string): Promise<{
  ok: boolean;
  applied: number;
  error?: string;
  skipped?: boolean;
}> {
  try {
    const res = await fetch("/api/cloud/sync", { method: "GET" });
    const data = await parseJsonResponse<{
      error?: string;
      bundle?: CloudSyncBundle | null;
      upgradeRequired?: boolean;
    }>(res);
    if (!res.ok) return { ok: false, applied: 0, error: data.error ?? "Sync failed" };
    if (!data.bundle || !isValidSyncBundle(data.bundle)) return { ok: true, applied: 0 };

    const localUpdated = localStorage.getItem(syncMetaKey(userId));
    if (localUpdated && data.bundle.updatedAt < localUpdated) {
      return { ok: true, applied: 0, skipped: true };
    }

    const applied = applyCloudSyncBundle(data.bundle, userId);
    return { ok: true, applied };
  } catch (e) {
    return {
      ok: false,
      applied: 0,
      error: e instanceof Error ? e.message : "Sync failed",
    };
  }
}

export async function uploadCompanionFile(
  file: File,
  path: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const key = path.replace(/^\/+/, "");
    const res = await fetch(`/api/r2/upload?key=${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    const data = await parseJsonResponse<{ error?: string; url?: string }>(res);
    if (!res.ok) return { ok: false, error: data.error ?? "Upload failed" };
    return { ok: true, url: data.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed" };
  }
}
