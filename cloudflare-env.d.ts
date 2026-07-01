interface CloudflareEnv {
  ASSETS: Fetcher;
  WORKER_SELF_REFERENCE: Fetcher;
  NEXT_INC_CACHE_R2_BUCKET: R2Bucket;
  COMPANION_FILES: R2Bucket;
  AI: Ai;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_SITE_URL: string;
  REGAL_DOMAIN: string;
  CLOUDFLARE_AI_MODEL?: string;
  GEMINI_API_KEY?: string;
}

declare global {
  type Env = CloudflareEnv;
}

export {};
