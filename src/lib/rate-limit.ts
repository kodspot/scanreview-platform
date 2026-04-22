const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const current = buckets.get(key)?.filter((entry) => entry > windowStart) || [];

  if (current.length >= limit) {
    buckets.set(key, current);
    return {
      allowed: false,
      remaining: 0,
      resetAt: current[0] + windowMs,
    };
  }

  current.push(now);
  buckets.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(0, limit - current.length),
    resetAt: now + windowMs,
  };
}
