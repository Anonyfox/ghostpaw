const GENERAL_RATE_LIMIT = 100;
const GENERAL_RATE_WINDOW_MS = 60_000;

const generalRateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkGeneralRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = generalRateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    generalRateBuckets.set(ip, { count: 1, resetAt: now + GENERAL_RATE_WINDOW_MS });
    return true;
  }
  bucket.count++;
  return bucket.count <= GENERAL_RATE_LIMIT;
}

export function cleanupGeneralBuckets(): void {
  const now = Date.now();
  for (const [ip, bucket] of generalRateBuckets) {
    if (now > bucket.resetAt) generalRateBuckets.delete(ip);
  }
}

export function resetGeneralBuckets(): void {
  generalRateBuckets.clear();
}
