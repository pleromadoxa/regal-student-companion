#!/usr/bin/env node
/**
 * Create R2 cache bucket for OpenNext incremental cache.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const WORKER = process.env.CLOUDFLARE_WORKER_NAME?.trim() || "regal-companion";
const CACHE_BUCKET = "regal-companion-cache";

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const path = join(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  }
}

async function cf(path, init = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!token || !accountId) throw new Error("Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID");

  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  return res.json();
}

async function ensureCacheBucket(accountId, token) {
  const list = await cf(`/accounts/${accountId}/r2/buckets`);
  if (!list.success) throw new Error(list.errors?.[0]?.message ?? "R2 list failed");

  if (list.result?.buckets?.some((b) => b.name === CACHE_BUCKET)) {
    console.log(`✓ R2 cache bucket "${CACHE_BUCKET}" exists`);
    return;
  }

  const create = await cf(`/accounts/${accountId}/r2/buckets`, {
    method: "POST",
    body: JSON.stringify({ name: CACHE_BUCKET }),
  });
  if (!create.success) throw new Error(create.errors?.[0]?.message ?? "R2 create failed");
  console.log(`✓ Created R2 cache bucket "${CACHE_BUCKET}"`);
}

async function main() {
  loadEnvFiles();
  console.log("Regal Companion — Cloudflare Pages / Worker setup\n");

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !token) {
    throw new Error("Run npm run sync:cloudflare-credentials first");
  }

  await ensureCacheBucket(accountId, token);
  console.log(`
OpenNext deploys to Worker "${WORKER}".
Run: npm run deploy  →  build + deploy
Run: npm run setup:worker-domain  →  attach regalcompanion.cloud
`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
