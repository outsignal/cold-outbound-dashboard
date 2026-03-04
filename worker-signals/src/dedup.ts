// Social post URL deduplication via SeenSignalUrl table.
// Prevents re-processing the same Reddit/Twitter posts across cycles.
//
// isSeenUrl        — check if a URL was already processed in a previous cycle.
// markUrlSeen      — record a URL as processed (idempotent upsert).
// cleanupOldSeenUrls — remove entries older than 30 days to keep the table lean.

import { prisma } from "./db.js";

// ---------------------------------------------------------------------------
// isSeenUrl
// ---------------------------------------------------------------------------

/**
 * Check whether a social post URL has already been processed in a previous cycle.
 *
 * @param url - Full URL of the social post
 * @returns true if the URL was previously seen
 */
export async function isSeenUrl(url: string): Promise<boolean> {
  const record = await prisma.seenSignalUrl.findUnique({
    where: { url },
    select: { url: true },
  });
  return record !== null;
}

// ---------------------------------------------------------------------------
// markUrlSeen
// ---------------------------------------------------------------------------

/**
 * Mark a social post URL as seen.
 * Idempotent — safe to call multiple times for the same URL.
 *
 * @param url - Full URL of the social post
 */
export async function markUrlSeen(url: string): Promise<void> {
  await prisma.seenSignalUrl.upsert({
    where: { url },
    create: { url },
    update: {}, // No fields to update — just ensure the row exists
  });
}

// ---------------------------------------------------------------------------
// cleanupOldSeenUrls
// ---------------------------------------------------------------------------

/**
 * Remove SeenSignalUrl entries older than 30 days.
 * Keeps the table lean by pruning URLs that are no longer relevant.
 * Called at the start of each cycle alongside expireOldSignals().
 *
 * @returns Count of entries deleted
 */
export async function cleanupOldSeenUrls(): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await prisma.seenSignalUrl.deleteMany({
    where: {
      seenAt: { lt: thirtyDaysAgo },
    },
  });

  return result.count;
}
