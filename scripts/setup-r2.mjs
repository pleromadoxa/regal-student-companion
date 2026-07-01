#!/usr/bin/env node
/**
 * Create regal-companion R2 bucket and apply browser-upload CORS.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BUCKET = "regal-companion";

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const path = join(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
    }
  }
}

async function ensureBucket(accountId, token, bucket) {
  const listRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listRes.json();
  if (!listData.success) {
    throw new Error(`List buckets failed: ${listData.errors?.[0]?.message ?? JSON.stringify(listData.errors)}`);
  }
  if (listData.result?.buckets?.some((b) => b.name === bucket)) {
    console.log(`✓ Bucket "${bucket}" already exists`);
    return;
  }
  const createRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: bucket }),
    }
  );
  const createData = await createRes.json();
  if (!createData.success) {
    throw new Error(`Create bucket failed: ${createData.errors?.[0]?.message ?? JSON.stringify(createData.errors)}`);
  }
  console.log(`✓ Created bucket "${bucket}"`);
}

async function applyCors(accountId, accessKey, secretKey, bucket) {
  const { S3Client, PutBucketCorsCommand } = await import("@aws-sdk/client-s3");
  const corsRules = JSON.parse(readFileSync(join(__dirname, "../cloudflare/r2-cors.json"), "utf8"));
  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_S3_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  });
  await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: corsRules } }));
  console.log("✓ R2 CORS applied from cloudflare/r2-cors.json");
}

function upsertEnvLocal(key, value) {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split("\n");
  const prefix = `${key}=`;
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true;
      return `${prefix}${value}`;
    }
    return line;
  });
  if (!found) next.push(`${prefix}${value}`);
  writeFileSync(path, next.join("\n") + "\n");
  console.log(`✓ Saved ${key} to .env.local`);
}

async function main() {
  loadEnvFiles();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const accessKey = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim() || DEFAULT_BUCKET;

  if (!token || !accountId || !accessKey || !secretKey) {
    throw new Error("Missing credentials. Run: npm run sync:cloudflare-credentials");
  }

  await ensureBucket(accountId, token, bucket);
  await applyCors(accountId, accessKey, secretKey, bucket);
  upsertEnvLocal("R2_BUCKET_NAME", bucket);
  console.log("\nR2 ready for Regal Companion cloud sync and file storage.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
