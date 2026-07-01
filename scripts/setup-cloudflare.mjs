#!/usr/bin/env node
import { execSync } from "node:child_process";

function run(cmd, label) {
  console.log(`\n▶ ${label}`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
    return true;
  } catch {
    console.warn(`⚠ Skipped: ${label}`);
    return false;
  }
}

console.log("Regal Student Companion — Cloudflare setup\n");

run("node scripts/sync-cloudflare-credentials.mjs", "Sync credentials from CLOUDFLARE 2.md");
run("node scripts/setup-r2.mjs", "R2 bucket (regal-companion) + CORS");
run("node scripts/setup-pages.mjs", "OpenNext R2 cache bucket");

console.log(`
Next steps:
  1. npm install
  2. npm run deploy
  3. cd cloudflare/worker is NOT needed — OpenNext deploys the full Next.js app
  4. npx wrangler secret put GEMINI_API_KEY   (if not already set)
  5. npm run setup:worker-domain  →  regalcompanion.cloud
`);
