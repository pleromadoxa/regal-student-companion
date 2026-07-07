interface CloudflareEnv {
  ASSETS: Fetcher;
  WORKER_SELF_REFERENCE: Fetcher;
  NEXT_INC_CACHE_R2_BUCKET: R2Bucket;
  COMPANION_FILES: R2Bucket;
  AI: Ai;
  EMAIL?: {
    send: (message: {
      to: string;
      from: string;
      subject: string;
      html: string;
      text: string;
    }) => Promise<unknown>;
  };
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_SITE_URL: string;
  REGAL_DOMAIN: string;
  EMAIL_FROM_ADDRESS?: string;
  CLOUDFLARE_AI_MODEL?: string;
  GEMINI_API_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  PAYSTACK_SECRET_KEY?: string;
}

declare global {
  type Env = CloudflareEnv;
}

export {};
