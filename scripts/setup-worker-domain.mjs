#!/usr/bin/env node
/**
 * Attach regalcompanion.cloud to the OpenNext Worker.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DOMAIN = process.env.REGAL_DOMAIN?.trim() || "regalcompanion.cloud";
const WWW = `www.${DOMAIN}`;
const WORKER = process.env.CLOUDFLARE_WORKER_NAME?.trim() || "regal-companion";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "3f81e3d72ae8a518ec565b98308fa47b";

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
  if (!token) throw new Error("Missing CLOUDFLARE_API_TOKEN in .env.local");

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

async function checkWorker() {
  const res = await cf(`/accounts/${ACCOUNT_ID}/workers/services/${WORKER}`);
  if (!res.success) {
    console.warn(`⚠ Worker "${WORKER}" not found. Run: npm run deploy`);
    return false;
  }
  console.log(`✓ Worker "${WORKER}" is deployed`);
  return true;
}

async function listWorkerDomains() {
  const res = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER}/domains`);
  if (!res.success) return [];
  return res.result ?? [];
}

async function tryAddWorkerDomain(hostname) {
  const res = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER}/domains`, {
    method: "POST",
    body: JSON.stringify({ hostname }),
  });
  if (res.success) {
    console.log(`✓ Attached Worker custom domain: ${hostname}`);
    return true;
  }
  const msg = res.errors?.[0]?.message ?? "unknown error";
  console.warn(`⚠ Could not attach ${hostname}: ${msg}`);
  return false;
}

async function removePagesDomain(name) {
  const res = await cf(`/accounts/${ACCOUNT_ID}/pages/projects/${WORKER}/domains/${name}`, {
    method: "DELETE",
  });
  if (res.success) console.log(`✓ Removed conflicting Pages domain: ${name}`);
}

function printManualSteps() {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CONNECT ${DOMAIN} → Worker "${WORKER}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Worker custom domains:
   https://dash.cloudflare.com/${ACCOUNT_ID}/workers-and-pages/view/${WORKER}/settings/domains
   Add: ${DOMAIN} and ${WWW}

2. Verify (after ~1–2 minutes):
   curl -I https://${DOMAIN}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

async function main() {
  loadEnvFiles();
  console.log(`Regal Companion — Worker custom domain setup for ${DOMAIN}\n`);

  await checkWorker();

  const existing = await listWorkerDomains();
  const names = new Set(existing.map((d) => d.hostname ?? d.zone_name));
  for (const host of [DOMAIN, WWW]) {
    if (names.has(host)) {
      console.log(`✓ Worker domain already attached: ${host}`);
      continue;
    }
    await tryAddWorkerDomain(host);
  }

  for (const host of [DOMAIN, WWW]) {
    await removePagesDomain(host);
  }

  const after = await listWorkerDomains();
  const attached = after.filter((d) => [DOMAIN, WWW].includes(d.hostname));
  if (attached.length >= 2) {
    console.log("\nWorker custom domains configured. DNS may take 1–2 minutes to propagate.");
    return;
  }

  printManualSteps();
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  printManualSteps();
  process.exit(1);
});
