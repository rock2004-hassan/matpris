/**
 * Simple client-side rate limit helper (point 08).
 * For production APIs use Upstash Redis / Vercel KV / middleware.
 */

const WINDOW_MS = 60_000;
const MAX_ACTIONS = 30;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, max = MAX_ACTIONS, windowMs = WINDOW_MS): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (b.count >= max) {
    return { allowed: false, remaining: 0 };
  }
  b.count += 1;
  return { allowed: true, remaining: max - b.count };
}
