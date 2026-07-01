export const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Resource-Policy": "same-site",
};

const BLOCKED_UA = [/sqlmap/i, /nikto/i, /nmap/i, /acunetix/i, /dirbuster/i, /gobuster/i];
const PROBE_PATHS =
  /(?:^|\/)\.?env(?:\.|$|\/|)|\.git(?:\/|$)|wp-(?:admin|login)|phpmyadmin|cpanel|xmlrpc\.php/i;

export function isBlockedBot(ua: string | null): boolean {
  if (!ua || ua.trim().length < 8) return false;
  return BLOCKED_UA.some((p) => p.test(ua));
}

export function isProbePath(pathname: string): boolean {
  return PROBE_PATHS.test(pathname);
}

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return withSecurityHeaders(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMemory(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (memoryBuckets.size > 10_000) {
    for (const [k, v] of memoryBuckets) {
      if (now > v.resetAt) memoryBuckets.delete(k);
    }
  }
  const bucket = memoryBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP")?.trim() ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function assertUserStorageKey(key: string, userId: string): boolean {
  return key.startsWith(`users/${userId}/`) && !key.includes("..");
}

export function syncStorageKey(userId: string): string {
  return `users/${userId}/sync/bundle.json`;
}
