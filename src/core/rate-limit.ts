import { RateLimitError } from "@/core/errors";

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: () => number = Date.now,
): void {
  const current = now();
  if (buckets.size >= MAX_BUCKETS) {
    for (const [bucketKey, bucket] of buckets) {
      if (current - bucket.windowStart >= windowMs) buckets.delete(bucketKey);
    }
  }
  const bucket = buckets.get(key);
  if (!bucket || current - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: current });
    return;
  }
  if (bucket.count >= limit) {
    throw new RateLimitError(
      "Çok sık bildirim gönderdiniz. Lütfen birkaç dakika sonra tekrar deneyin.",
    );
  }
  bucket.count += 1;
}

export function _resetRateLimits(): void {
  buckets.clear();
}
