type Bucket = number[];

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const current = (buckets.get(key) || []).filter((entry) => entry > windowStart);

  if (current.length >= limit) {
    buckets.set(key, current);
    const oldest = current[0] ?? now;
    const resetAt = oldest + windowMs;
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  current.push(now);
  buckets.set(key, current);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - current.length),
    resetAt: now + windowMs,
    retryAfterSeconds: 0,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }
  return headers;
}

// Best-effort cleanup of the in-memory map. Real multi-region deployments
// should swap this module for a Redis-backed adapter (e.g. Upstash) — see
// docs/architecture.md.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_BUCKETS = 10_000;

const cleanupGlobal = globalThis as { __srRateLimitCleanup?: boolean };
if (!cleanupGlobal.__srRateLimitCleanup) {
  cleanupGlobal.__srRateLimitCleanup = true;
  const interval = setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [key, entries] of buckets.entries()) {
      const filtered = entries.filter((entry) => entry > cutoff);
      if (filtered.length === 0) {
        buckets.delete(key);
      } else if (filtered.length !== entries.length) {
        buckets.set(key, filtered);
      }
    }
    if (buckets.size > MAX_BUCKETS) {
      buckets.clear();
    }
  }, CLEANUP_INTERVAL_MS);
  if (interval && typeof (interval as { unref?: () => void }).unref === "function") {
    (interval as { unref: () => void }).unref();
  }
}
