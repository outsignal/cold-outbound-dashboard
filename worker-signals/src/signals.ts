// Signal DB writer, high-intent stacking detection, and TTL cleanup.
//
// writeSignalEvents  — upserts SignalInput[] into the SignalEvent table.
// checkAndFlagHighIntent — detects 2+ distinct signal types on a company within 30 days.
// expireOldSignals   — marks signals with expiresAt in the past as "expired".
// disconnectPrisma   — closes the Prisma connection pool (call before process.exit).

import { PrismaClient } from "@prisma/client";
import type { SignalInput } from "./types.js";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// writeSignalEvents
// ---------------------------------------------------------------------------

/**
 * Write an array of SignalInput records to the SignalEvent table.
 *
 * - If externalId is present: upserts on (source, externalId) composite unique key.
 * - If externalId is null: always creates (no stable key to dedup on — e.g. social mentions).
 * - Sets expiresAt to 90 days from now.
 * - After writing, calls checkAndFlagHighIntent for each unique companyDomain in the batch.
 *
 * @param signals       - Array of SignalInput records from adapters
 * @param workspaceSlug - Workspace to associate these signals with
 * @returns Count of signals written (created or updated)
 */
export async function writeSignalEvents(
  signals: SignalInput[],
  workspaceSlug: string,
): Promise<number> {
  if (signals.length === 0) return 0;

  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
  let written = 0;

  for (const signal of signals) {
    const data = {
      signalType: signal.signalType,
      source: signal.source,
      externalId: signal.externalId,
      companyDomain: signal.companyDomain,
      companyName: signal.companyName,
      workspaceSlug,
      title: signal.title,
      summary: signal.summary,
      confidence: signal.confidence,
      sourceUrl: signal.sourceUrl,
      rawResponse: signal.rawResponse,
      metadata: signal.metadata,
      expiresAt,
    };

    if (signal.externalId !== null) {
      // Upsert: dedup by (source, externalId) — updates expiresAt + all mutable fields
      await prisma.signalEvent.upsert({
        where: {
          source_externalId: {
            source: signal.source,
            externalId: signal.externalId,
          },
        },
        create: data,
        update: {
          // Refresh mutable fields on re-detection (title/summary may improve over time)
          title: signal.title,
          summary: signal.summary,
          confidence: signal.confidence,
          sourceUrl: signal.sourceUrl,
          rawResponse: signal.rawResponse,
          metadata: signal.metadata,
          expiresAt, // Extend TTL on re-detection
          status: "active", // Re-activate if it was somehow expired
        },
      });
    } else {
      // No stable ID — always create (social mentions, etc.)
      await prisma.signalEvent.create({ data });
    }

    written++;
  }

  // After writing, check high-intent stacking for each unique company in this batch
  const uniqueDomains = [...new Set(signals.map((s) => s.companyDomain))];
  for (const domain of uniqueDomains) {
    await checkAndFlagHighIntent(domain, workspaceSlug);
  }

  return written;
}

// ---------------------------------------------------------------------------
// checkAndFlagHighIntent
// ---------------------------------------------------------------------------

/**
 * Check if a company has 2+ distinct signal types active in the last 30 days.
 * If so, set isHighIntent=true on ALL active signals for this company+workspace.
 * If not, set isHighIntent=false (clears stale high-intent flags).
 *
 * @param companyDomain - Company domain to evaluate
 * @param workspaceSlug - Workspace scope
 */
export async function checkAndFlagHighIntent(
  companyDomain: string,
  workspaceSlug: string,
): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recentSignals = await prisma.signalEvent.findMany({
    where: {
      companyDomain,
      workspaceSlug,
      status: "active",
      detectedAt: { gte: thirtyDaysAgo },
    },
    select: { signalType: true },
  });

  const distinctTypes = new Set(recentSignals.map((s: { signalType: string }) => s.signalType));
  const isHighIntent = distinctTypes.size >= 2;

  await prisma.signalEvent.updateMany({
    where: {
      companyDomain,
      workspaceSlug,
      status: "active",
    },
    data: { isHighIntent },
  });
}

// ---------------------------------------------------------------------------
// expireOldSignals
// ---------------------------------------------------------------------------

/**
 * Mark all active signals whose expiresAt is in the past as "expired".
 * Run this at the start of each cycle to prevent stale signals from
 * affecting high-intent stacking calculations.
 *
 * @returns Count of signals expired
 */
export async function expireOldSignals(): Promise<number> {
  const result = await prisma.signalEvent.updateMany({
    where: {
      status: "active",
      expiresAt: { lt: new Date() },
    },
    data: { status: "expired" },
  });

  return result.count;
}

// ---------------------------------------------------------------------------
// disconnectPrisma
// ---------------------------------------------------------------------------

/**
 * Cleanly close the Prisma connection pool.
 * Must be called before process.exit(0) in Railway cron workers to avoid
 * keeping the process alive (which causes Railway to skip subsequent runs).
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
