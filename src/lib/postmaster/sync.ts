/**
 * Google Postmaster Tools daily sync.
 * Pulls traffic stats for all verified domains and stores in PostmasterStats.
 */

import { prisma } from "@/lib/db";
import { getPostmasterClient } from "./client";

const LOG_PREFIX = "[postmaster-sync]";

export interface SyncResult {
  domain: string;
  date: string;
  hasData: boolean;
  spamRate: number | null;
  domainReputation: string | null;
}

/**
 * Sync traffic stats for all verified domains for a given date.
 * Google has ~2 day lag, so default is day before yesterday.
 */
export async function syncPostmasterStats(
  targetDate?: Date
): Promise<{ synced: SyncResult[]; errors: string[] }> {
  const client = await getPostmasterClient();
  if (!client) {
    return { synced: [], errors: ["Postmaster auth not configured"] };
  }

  // Default to 2 days ago (Google's data lag)
  const date = targetDate ?? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const synced: SyncResult[] = [];
  const errors: string[] = [];

  // List all verified domains
  let domains: string[] = [];
  try {
    const { data } = await client.domains.list();
    domains = (data.domains ?? [])
      .map((d) => d.name?.replace("domains/", "") ?? "")
      .filter(Boolean);

    if (domains.length === 0) {
      console.log(`${LOG_PREFIX} No verified domains found in Postmaster Tools`);
      return { synced: [], errors: [] };
    }

    console.log(`${LOG_PREFIX} Found ${domains.length} verified domains: ${domains.join(", ")}`);
  } catch (err) {
    const msg = `Failed to list domains: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`${LOG_PREFIX} ${msg}`);
    return { synced: [], errors: [msg] };
  }

  // Pull stats for each domain
  for (const domain of domains) {
    try {
      const { data: stats } = await client.domains.trafficStats.get({
        name: `domains/${domain}/trafficStats/${dateStr}`,
      });

      // Check if Google returned data (low-volume domains may have no data)
      const hasData = !!(
        stats.userReportedSpamRatio !== undefined ||
        stats.domainReputation ||
        stats.spfSuccessRatio !== undefined
      );

      if (!hasData) {
        console.log(`${LOG_PREFIX} No data for ${domain} on ${dateStr} (likely below volume threshold)`);
        synced.push({ domain, date: dateStr, hasData: false, spamRate: null, domainReputation: null });
        continue;
      }

      // Upsert stats record
      const statsData = {
        spamRate: stats.userReportedSpamRatio ?? null,
        spamRateLower: stats.userReportedSpamRatioLowerBound ?? null,
        spamRateUpper: stats.userReportedSpamRatioUpperBound ?? null,
        domainReputation: stats.domainReputation ?? null,
        spfSuccessRatio: stats.spfSuccessRatio ?? null,
        dkimSuccessRatio: stats.dkimSuccessRatio ?? null,
        dmarcSuccessRatio: stats.dmarcSuccessRatio ?? null,
        outboundEncryptionRatio: stats.outboundEncryptionRatio ?? null,
        deliveryErrors: stats.deliveryErrors ? JSON.stringify(stats.deliveryErrors) : null,
        ipReputations: stats.ipReputations ? JSON.stringify(stats.ipReputations) : null,
        rawData: JSON.stringify(stats),
      };

      await prisma.postmasterStats.upsert({
        where: {
          domain_date: {
            domain,
            date: new Date(`${dateStr}T00:00:00Z`),
          },
        },
        create: {
          domain,
          date: new Date(`${dateStr}T00:00:00Z`),
          ...statsData,
        },
        update: statsData,
      });

      console.log(
        `${LOG_PREFIX} Synced ${domain} for ${dateStr}: spam=${stats.userReportedSpamRatio ?? "n/a"}, reputation=${stats.domainReputation ?? "n/a"}`
      );

      synced.push({
        domain,
        date: dateStr,
        hasData: true,
        spamRate: stats.userReportedSpamRatio ?? null,
        domainReputation: stats.domainReputation ?? null,
      });
    } catch (err: unknown) {
      // 404 = no data for that date (normal for low-volume days)
      const status = (err as { code?: number }).code;
      if (status === 404) {
        console.log(`${LOG_PREFIX} No data for ${domain} on ${dateStr} (404)`);
        synced.push({ domain, date: dateStr, hasData: false, spamRate: null, domainReputation: null });
        continue;
      }

      const msg = `Failed to sync ${domain}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`${LOG_PREFIX} ${msg}`);
      errors.push(msg);
    }
  }

  return { synced, errors };
}
