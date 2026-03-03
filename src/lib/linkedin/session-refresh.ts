import { prisma } from "@/lib/db";

/**
 * Find active senders with LinkedIn sessions older than 6 days,
 * flag them as expired, and create audit trail entries.
 *
 * Extracted from /api/cron/session-refresh so it can be called
 * from the consolidated inbox-health/check cron as well.
 */
export async function refreshStaleSessions(): Promise<{
  count: number;
  senders: string[];
}> {
  const SIX_DAYS_AGO = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

  // Find active senders with sessions older than 6 days
  const staleSenders = await prisma.sender.findMany({
    where: {
      status: "active",
      sessionStatus: "active",
      updatedAt: { lt: SIX_DAYS_AGO },
      // Only senders with session data (have been authenticated)
      sessionData: { not: null },
    },
    select: {
      id: true,
      name: true,
      workspaceSlug: true,
      updatedAt: true,
    },
  });

  if (staleSenders.length === 0) {
    return { count: 0, senders: [] };
  }

  // Flag each stale sender for re-auth
  // Set sessionStatus to 'expired' -- this prevents the worker from using them
  // and signals to the admin that re-auth is needed (visible on sender cards)
  const flagged: string[] = [];
  for (const sender of staleSenders) {
    await prisma.sender.update({
      where: { id: sender.id },
      data: {
        sessionStatus: "expired",
        healthStatus: "session_expired",
      },
    });

    // Create a health event for audit trail
    await prisma.senderHealthEvent.create({
      data: {
        senderId: sender.id,
        status: "session_expired",
        reason: "session_expired",
        detail: `Proactive session refresh: session last updated ${sender.updatedAt.toISOString()}, older than 6 days`,
      },
    });

    flagged.push(`${sender.name} (${sender.workspaceSlug})`);
  }

  console.log(
    `[Session Refresh] Flagged ${flagged.length} stale sender sessions:`,
    flagged,
  );

  return { count: flagged.length, senders: flagged };
}
