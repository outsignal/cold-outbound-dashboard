import { schedules } from "@trigger.dev/sdk";
import { syncPostmasterStats } from "@/lib/postmaster/sync";
import { checkAndAlert } from "@/lib/postmaster/alerts";
import { isPostmasterConfigured } from "@/lib/postmaster/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LOG_PREFIX = "[postmaster-stats-sync]";

export const postmasterStatsSyncTask = schedules.task({
  id: "postmaster-stats-sync",
  cron: "0 10 * * *", // daily 10am UTC (matching previous cron-job.org schedule)
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },

  run: async () => {
    const timestamp = new Date().toISOString();
    console.log(`${LOG_PREFIX} Starting Postmaster sync at ${timestamp}`);

    // Skip if Postmaster not configured
    const configured = await isPostmasterConfigured();
    if (!configured) {
      console.log(`${LOG_PREFIX} Postmaster not configured -- skipping`);
      return {
        status: "skipped",
        reason: "Postmaster OAuth not configured. Visit /api/auth/google-postmaster to set up.",
        timestamp,
      };
    }

    // Sync stats (defaults to 2 days ago due to Google's data lag)
    const { synced, errors } = await syncPostmasterStats();

    // Run alerts for domains that had data
    const alertResults = [];
    for (const result of synced) {
      if (!result.hasData) continue;

      // Fetch the full record we just upserted for alerting
      const record = await prisma.postmasterStats.findUnique({
        where: {
          domain_date: {
            domain: result.domain,
            date: new Date(`${result.date}T00:00:00Z`),
          },
        },
      });

      if (record) {
        const alertResult = await checkAndAlert({
          domain: record.domain,
          date: result.date,
          spamRate: record.spamRate,
          domainReputation: record.domainReputation,
          spfSuccessRatio: record.spfSuccessRatio,
          dkimSuccessRatio: record.dkimSuccessRatio,
          dmarcSuccessRatio: record.dmarcSuccessRatio,
        });
        alertResults.push(alertResult);
      }
    }

    const summary = {
      status: errors.length === 0 ? "ok" : "partial",
      domainsProcessed: synced.length,
      domainsWithData: synced.filter((s) => s.hasData).length,
      alerts: alertResults.filter((a) => a.alerts.length > 0),
      errors,
      timestamp,
    };

    console.log(
      `${LOG_PREFIX} Complete: ${synced.length} domains processed, ${alertResults.filter((a) => a.alerts.length > 0).length} alerts fired`,
    );

    return summary;
  },
});
