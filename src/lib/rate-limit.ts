/**
 * Minimal in-memory fixed-window rate limiter for public HTTP endpoints.
 *
 * It lives inside a single serverless isolate, so it is a flood/abuse brake
 * (one client hammering one worker), not a distributed quota. It needs no extra
 * infrastructure and never blocks legitimate traffic at normal volumes.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_KEYS) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    if (buckets.size > MAX_KEYS) buckets.clear();
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds };
}

/** Best-effort caller identity for rate limiting (never used for authorization). */
export function clientKey(request: Request, scope: string): string {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ??
    "unknown";
  return `${scope}:${ip || "unknown"}`;
}

export function tooManyRequests(result: RateLimitResult): Response {
  return new Response("Too many requests", {
    status: 429,
    headers: { "Retry-After": String(result.retryAfterSeconds) },
  });
}
