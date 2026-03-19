export interface RateLimiter {
  check(ip: string): boolean;
  cleanup(): void;
}

interface Bucket {
  count: number;
  windowStart: number;
}

export function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return {
    check(ip: string): boolean {
      const now = Date.now();
      let bucket = buckets.get(ip);
      if (!bucket || now - bucket.windowStart > windowMs) {
        bucket = { count: 0, windowStart: now };
        buckets.set(ip, bucket);
      }
      bucket.count++;
      return bucket.count <= maxRequests;
    },

    cleanup(): void {
      const now = Date.now();
      for (const [ip, bucket] of buckets.entries()) {
        if (now - bucket.windowStart > windowMs) buckets.delete(ip);
      }
    },
  };
}
