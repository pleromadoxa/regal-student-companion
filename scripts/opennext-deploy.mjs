#!/usr/bin/env node
/**
 * Build and deploy OpenNext to Cloudflare with credentials from .env.local
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const path = join(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

loadEnvFiles();
execSync("npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy", {
  stdio: "inherit",
  env: process.env,
});
