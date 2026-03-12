/**
 * Daily cron: Google Postmaster Tools stats sync.
 * Pulls traffic stats for all verified domains and alerts on concerning metrics.
 * Schedule: daily at 10:00 UTC (after Google's ~2-day data lag)
 */

import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron-auth";
import { syncPostmasterStats } from "@/lib/postmaster/sync";
import { checkAndAlert } from "@/lib/postmaster/alerts";
import { isPostmasterConfigured } from "@/lib/postmaster/client";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

const LOG_PREFIX = "[postmaster-cron]";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timestamp = new Date().toISOString();
  console.log(`${LOG_PREFIX} Starting Postmaster sync at ${timestamp}`);

  // Check if Postmaster is configured
  const configured = await isPostmasterConfigured();
  if (!configured) {
    console.log(`${LOG_PREFIX} Postmaster not configured -- skipping`);
    return NextResponse.json({
      status: "skipped",
      reason: "Postmaster OAuth not configured. Visit /api/auth/google-postmaster to set up.",
      timestamp,
    });
  }

  try {
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
      `${LOG_PREFIX} Complete: ${synced.length} domains processed, ${alertResults.filter((a) => a.alerts.length > 0).length} alerts fired`
    );

    return NextResponse.json(summary);
  } catch (error) {
    console.error(`${LOG_PREFIX} Fatal error:`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Postmaster sync failed",
        timestamp,
      },
      { status: 500 }
    );
  }
}
