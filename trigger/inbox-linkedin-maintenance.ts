import { schedules } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { progressWarmup } from "@/lib/linkedin/rate-limiter";
import { updateAcceptanceRate } from "@/lib/linkedin/sender";
import { recoverStuckActions, expireStaleActions } from "@/lib/linkedin/queue";

// PrismaClient at module scope — not inside run()
const prisma = new PrismaClient();

export const inboxLinkedinMaintenanceTask = schedules.task({
  id: "inbox-linkedin-maintenance",
  cron: "0 */6 * * *", // every 6 hours — more frequent than daily
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },

  run: async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [inbox-linkedin-maintenance] Starting LinkedIn maintenance`);

    const activeSenders = await prisma.sender.findMany({
      where: { status: "active" },
      select: { id: true, name: true },
    });

    let warmupProcessed = 0;
    let warmupErrors = 0;

    // Sequential per-sender loop — safe default, per-sender DB queries, no parallelism needed
    for (const sender of activeSenders) {
      try {
        await progressWarmup(sender.id);
        warmupProcessed++;
      } catch (err) {
        warmupErrors++;
        console.error(`[inbox-linkedin-maintenance] progressWarmup failed for ${sender.name}:`, err);
      }
      try {
        await updateAcceptanceRate(sender.id);
      } catch (err) {
        console.error(`[inbox-linkedin-maintenance] updateAcceptanceRate failed for ${sender.name}:`, err);
      }
    }

    const stuckRecovered = await recoverStuckActions();
    const staleExpired = await expireStaleActions();

    console.log(
      `[${timestamp}] [inbox-linkedin-maintenance] Complete: warmup=${warmupProcessed}/${activeSenders.length}, errors=${warmupErrors}, stuck=${stuckRecovered}, expired=${staleExpired}`,
    );

    return {
      warmupProcessed,
      warmupErrors,
      stuckRecovered,
      staleExpired,
      totalSenders: activeSenders.length,
    };
  },
});
