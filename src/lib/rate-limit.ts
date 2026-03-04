/**
 * Simple in-memory sliding window rate limiter.
 *
 * Uses a Map keyed by identifier (e.g. IP address). Each entry stores an array
 * of timestamps for requests within the current window. Stale entries are
 * cleaned up lazily on each call to avoid unbounded memory growth.
 *
 * This resets on cold start, which is fine for Vercel serverless — each
 * function instance gets its own Map, and instances are short-lived.
 */

interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed per window */
  max: number;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Remaining requests in the current window */
  remaining: number;
}

export function rateLimit(
  options: RateLimitOptions,
): (key: string) => RateLimitResult {
  const { windowMs, max } = options;
  const hits = new Map<string, number[]>();

  // Periodic cleanup interval to prevent memory leaks from stale keys.
  // Runs every 60 seconds and removes entries with no recent timestamps.
  const CLEANUP_INTERVAL = 60_000;
  let lastCleanup = Date.now();

  function cleanup(now: number) {
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    for (const [key, timestamps] of hits) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, valid);
      }
    }
  }

  return (key: string): RateLimitResult => {
    const now = Date.now();

    // Lazy cleanup of stale entries
    cleanup(now);

    // Get existing timestamps and filter to current window
    const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

    if (timestamps.length >= max) {
      // Over limit — don't record this request
      hits.set(key, timestamps);
      return { success: false, remaining: 0 };
    }

    // Record this request
    timestamps.push(now);
    hits.set(key, timestamps);

    return { success: true, remaining: max - timestamps.length };
  };
}
