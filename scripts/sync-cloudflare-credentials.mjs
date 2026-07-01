#!/usr/bin/env node
/**
 * Import Cloudflare credentials from ~/Documents/CLOUDFLARE 2.md into .env.local
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const SOURCES = [
  join(homedir(), "Documents", "CLOUDFLARE 2.md"),
  join(homedir(), "Documents", "Flysend", "CLOUDFLARE 2", "CLOUDFLARE 2.md"),
];

function parseMd(text) {
  const token = text.match(/API Token:\s*(\S+)/i)?.[1];
  const accessKey = text.match(/Access Key ID:\s*(\S+)/i)?.[1];
  const secretKey = text.match(/Secret Access Key:\s*(\S+)/i)?.[1];
  const endpoint = text.match(/S3 API endpoint:\s*(https:\/\/\S+)/i)?.[1];
  const accountId = endpoint?.match(/https:\/\/([^.]+)\.r2\.cloudflarestorage\.com/)?.[1];
  return { token, accessKey, secretKey, endpoint, accountId };
}

function upsertEnv(lines, key, value) {
  const prefix = `${key}=`;
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  return next;
}

function main() {
  const source = SOURCES.find((p) => existsSync(p));
  if (!source) {
    console.error("Could not find CLOUDFLARE 2.md in Documents");
    process.exit(1);
  }

  const parsed = parseMd(readFileSync(source, "utf8"));
  if (!parsed.token || !parsed.accessKey || !parsed.secretKey) {
    console.error("CLOUDFLARE 2.md is missing token or R2 keys");
    process.exit(1);
  }

  const envPath = join(process.cwd(), ".env.local");
  const existing = existsSync(envPath) ? readFileSync(envPath, "utf8").split("\n") : [];

  let lines = existing;
  lines = upsertEnv(lines, "CLOUDFLARE_API_TOKEN", parsed.token);
  if (parsed.accountId) {
    lines = upsertEnv(lines, "CLOUDFLARE_ACCOUNT_ID", parsed.accountId);
    lines = upsertEnv(lines, "R2_ACCOUNT_ID", parsed.accountId);
  }
  lines = upsertEnv(lines, "R2_ACCESS_KEY_ID", parsed.accessKey);
  lines = upsertEnv(lines, "R2_SECRET_ACCESS_KEY", parsed.secretKey);
  if (parsed.endpoint) lines = upsertEnv(lines, "R2_S3_ENDPOINT", parsed.endpoint);
  lines = upsertEnv(lines, "R2_BUCKET_NAME", "regal-companion");
  lines = upsertEnv(lines, "REGAL_DOMAIN", "regalcompanion.cloud");
  lines = upsertEnv(lines, "NEXT_PUBLIC_SITE_URL", "https://regalcompanion.cloud");
  lines = upsertEnv(lines, "CLOUDFLARE_WORKER_NAME", "regal-companion");
  lines = upsertEnv(lines, "CLOUDFLARE_AI_MODEL", "@cf/meta/llama-3.3-70b-instruct-fp8-fast");

  writeFileSync(envPath, lines.filter((l, i, a) => l !== "" || i < a.length - 1).join("\n") + "\n");
  console.log(`Synced Cloudflare credentials from ${source} → .env.local`);
  console.log("Next: npm run setup:cloudflare");
}

main();
