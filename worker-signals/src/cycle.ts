// Full poll cycle orchestration — the main logic for each 6-hour cron run.
//
// runCycle() executes in order:
//   1. Cleanup: expire old signals + remove stale seen URLs
//   2. Load workspace configs from DB
//   3. Build domain-workspace map (poll once per domain, fan out)
//   4. PredictLeads signals: job openings, financing, news, tech adoption
//   5. Serper social listening: competitor mentions on Reddit + Twitter
//   6. Log cycle summary

import { expireOldSignals, writeSignalEvents } from "./signals.js";
import { cleanupOldSeenUrls } from "./dedup.js";
import { loadWorkspaceConfigs, buildDomainWorkspaceMap } from "./workspaces.js";
import { checkWorkspaceCap, incrementWorkspaceSpend, alertBudgetCapHit } from "./governor.js";
import { fetchJobOpenings } from "./predictleads/job-openings.js";
import { fetchFinancingEvents } from "./predictleads/financing.js";
import { fetchNewsEvents } from "./predictleads/news.js";
import { fetchTechnologyDetections } from "./predictleads/technology.js";
import { searchCompetitorMentions } from "./serper/social.js";
import type { SignalInput } from "./types.js";
import { prisma } from "./db.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get an ISO date string for N hours ago — used as PredictLeads sinceDate filter.
 * Slightly more than the 6-hour cron interval to avoid gaps at cycle boundaries.
 */
function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/**
 * Shuffle an array in-place (Fisher-Yates) and return it.
 * Used to randomize domain processing order — ensures fair budget coverage
 * when a workspace hits its cap mid-cycle.
 */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]; // Copy to avoid mutating input
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]] as [T, T];
  }
  return a;
}

// ---------------------------------------------------------------------------
// runCycle
// ---------------------------------------------------------------------------

/**
 * Run one full signal polling cycle.
 *
 * Designed to be called from index.ts. All per-domain and per-workspace errors
 * are caught and logged — a single failure never aborts the entire cycle.
 */
export async function runCycle(): Promise<void> {
  const cycleStart = Date.now();
  console.log("[Cycle] Starting signal poll cycle");

  // --------------------------------------------------------------------------
  // Step 1: Cleanup
  // --------------------------------------------------------------------------
  const [expiredCount, cleanedUrlCount] = await Promise.all([
    expireOldSignals(),
    cleanupOldSeenUrls(),
  ]);
  console.log(
    `[Cycle] Cleanup: expired ${expiredCount} signals, removed ${cleanedUrlCount} stale seen URLs`,
  );

  // --------------------------------------------------------------------------
  // Step 2: Load workspace configs
  // --------------------------------------------------------------------------
  const configs = await loadWorkspaceConfigs();
  if (configs.length === 0) {
    console.log("[Cycle] No workspaces have signal monitoring enabled — exiting early");
    return;
  }
  console.log(`[Cycle] Loaded ${configs.length} signal-enabled workspace(s)`);

  // Build lookup map for quick access by slug
  const configBySlug = new Map(configs.map((c) => [c.slug, c]));

  // Track which workspaces have already hit their cap this cycle (avoid repeated Slack alerts)
  const capAlertedSlugs = new Set<string>();

  // Counters for cycle summary
  let totalSignalsWritten = 0;
  const processedWorkspaceSlugs = new Set<string>();
  let budgetCapsHit = 0;

  // --------------------------------------------------------------------------
  // Step 3: Build domain-workspace map
  // --------------------------------------------------------------------------
  const domainMap = buildDomainWorkspaceMap(configs);
  const uniqueDomains = shuffled([...domainMap.keys()]); // Randomize order for fair coverage
  console.log(`[Cycle] Processing ${uniqueDomains.length} unique domain(s) for PredictLeads`);

  // sinceDate: 7 hours ago (slightly more than 6h interval to avoid gaps)
  const sinceDate = hoursAgoIso(7);

  // --------------------------------------------------------------------------
  // Step 4: PredictLeads domain-based signals
  // --------------------------------------------------------------------------
  for (const domain of uniqueDomains) {
    const domainInfo = domainMap.get(domain)!;

    // Collect all enabled types across workspaces watching this domain
    const allEnabledTypes = new Set<string>();
    for (const slug of domainInfo.workspaceSlugs) {
      const wsTypes = domainInfo.enabledTypes.get(slug) ?? [];
      wsTypes.forEach((t) => allEnabledTypes.add(t));
    }

    // Determine which PredictLeads adapters need to run for this domain
    const shouldFetchJobOpenings = allEnabledTypes.has("job_change") || allEnabledTypes.has("hiring_spike");
    const shouldFetchFinancing = allEnabledTypes.has("funding");
    const shouldFetchNews = allEnabledTypes.has("news");
    const shouldFetchTech = allEnabledTypes.has("tech_adoption");

    // Fetch from all needed adapters — errors per domain are contained
    type AdapterResult = {
      signals: SignalInput[];
      costUsd: number;
      signalType: string;
      totalJobCount?: number;
    };
    const adapterResults: AdapterResult[] = [];

    try {
      if (shouldFetchJobOpenings) {
        const result = await fetchJobOpenings(domain, sinceDate);
        adapterResults.push({
          signals: result.signals,
          costUsd: result.costUsd,
          signalType: "job_change",
          totalJobCount: result.totalJobCount,
        });
      }

      if (shouldFetchFinancing) {
        const result = await fetchFinancingEvents(domain, sinceDate);
        adapterResults.push({ signals: result.signals, costUsd: result.costUsd, signalType: "funding" });
      }

      if (shouldFetchNews) {
        const result = await fetchNewsEvents(domain, sinceDate);
        adapterResults.push({ signals: result.signals, costUsd: result.costUsd, signalType: "news" });
      }

      if (shouldFetchTech) {
        const result = await fetchTechnologyDetections(domain, sinceDate);
        adapterResults.push({ signals: result.signals, costUsd: result.costUsd, signalType: "tech_adoption" });
      }
    } catch (error) {
      console.error(`[Cycle] Error fetching PredictLeads signals for domain "${domain}":`, error);
      continue; // Skip this domain — don't abort the cycle
    }

    // Determine if any workspace had a hiring spike (>10 jobs)
    const jobOpeningResult = adapterResults.find((r) => r.signalType === "job_change");
    const totalJobCount = jobOpeningResult?.totalJobCount ?? 0;

    // Fan out signals to each workspace watching this domain
    for (const workspaceSlug of domainInfo.workspaceSlugs) {
      const ws = configBySlug.get(workspaceSlug);
      if (!ws) continue;

      // Check budget cap before processing this workspace
      const capHit = await checkWorkspaceCap(workspaceSlug, ws.signalDailyCapUsd);
      if (capHit) {
        if (!capAlertedSlugs.has(workspaceSlug)) {
          budgetCapsHit++;
          capAlertedSlugs.add(workspaceSlug);
          console.warn(
            `[Cycle] Budget cap hit for workspace "${workspaceSlug}" — skipping domain "${domain}" and remaining domains`,
          );
          // Get current spend for alert message
          const todayDate = new Date().toISOString().slice(0, 10);
          const costRecord = await prisma.signalDailyCost.findUnique({
            where: { workspaceSlug_date: { workspaceSlug, date: todayDate } },
            select: { totalUsd: true },
          }).catch(() => null);
          const spentUsd = costRecord?.totalUsd ?? ws.signalDailyCapUsd;
          await alertBudgetCapHit(workspaceSlug, ws.name, ws.signalDailyCapUsd, spentUsd);
        }
        continue; // Skip this workspace for this domain
      }

      processedWorkspaceSlugs.add(workspaceSlug);

      // Filter and write signals for each adapter result
      for (const adapterResult of adapterResults) {
        const wsEnabledTypes = domainInfo.enabledTypes.get(workspaceSlug) ?? [];

        // Check if this workspace has this signal type enabled
        let typeEnabled = wsEnabledTypes.includes(adapterResult.signalType);
        // Hiring spike is enabled if the workspace has either "hiring_spike" or "job_change"
        if (adapterResult.signalType === "job_change") {
          typeEnabled = wsEnabledTypes.includes("job_change") || wsEnabledTypes.includes("hiring_spike");
        }
        if (!typeEnabled) continue;

        // Write base signals (job_change, funding, news, tech_adoption)
        if (adapterResult.signals.length > 0) {
          try {
            const written = await writeSignalEvents(adapterResult.signals, workspaceSlug);
            totalSignalsWritten += written;
          } catch (error) {
            console.error(
              `[Cycle] Error writing signals for workspace "${workspaceSlug}" domain "${domain}":`,
              error,
            );
          }
        }

        // Charge spend for this adapter call
        if (adapterResult.costUsd > 0) {
          await incrementWorkspaceSpend(workspaceSlug, adapterResult.costUsd, adapterResult.signalType);
        }
      }

      // Hiring spike detection: if >10 job openings returned, create a hiring_spike signal
      const hiringSpikEnabled = (domainInfo.enabledTypes.get(workspaceSlug) ?? []).includes("hiring_spike");
      if (hiringSpikEnabled && totalJobCount > 10) {
        const hiringSpike: SignalInput = {
          signalType: "hiring_spike",
          source: "predictleads",
          externalId: null, // No stable ID for synthetic signals — always creates
          companyDomain: domain,
          title: `Hiring spike detected: ${totalJobCount} open roles`,
          summary: `${domain} has ${totalJobCount} open job listings, indicating significant growth or scaling activity.`,
          rawResponse: JSON.stringify({ totalJobCount, domain }),
          metadata: JSON.stringify({ totalJobCount }),
        };

        try {
          const written = await writeSignalEvents([hiringSpike], workspaceSlug);
          totalSignalsWritten += written;
        } catch (error) {
          console.error(
            `[Cycle] Error writing hiring spike signal for workspace "${workspaceSlug}" domain "${domain}":`,
            error,
          );
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Step 5: Serper social listening
  // --------------------------------------------------------------------------
  const socialConfigs = configs.filter(
    (ws) =>
      ws.enabledTypes.includes("social_mention") &&
      ws.competitors.length > 0,
  );

  if (socialConfigs.length > 0) {
    console.log(`[Cycle] Running Serper social listening for ${socialConfigs.length} workspace(s)`);
  }

  for (const ws of socialConfigs) {
    // Check budget cap before social listening
    const capHit = await checkWorkspaceCap(ws.slug, ws.signalDailyCapUsd);
    if (capHit) {
      if (!capAlertedSlugs.has(ws.slug)) {
        budgetCapsHit++;
        capAlertedSlugs.add(ws.slug);
        console.warn(
          `[Cycle] Budget cap hit for workspace "${ws.slug}" — skipping Serper social listening`,
        );
        const todayDate = new Date().toISOString().slice(0, 10);
        const costRecord = await prisma.signalDailyCost.findUnique({
          where: { workspaceSlug_date: { workspaceSlug: ws.slug, date: todayDate } },
          select: { totalUsd: true },
        }).catch(() => null);
        const spentUsd = costRecord?.totalUsd ?? ws.signalDailyCapUsd;
        await alertBudgetCapHit(ws.slug, ws.name, ws.signalDailyCapUsd, spentUsd);
      }
      continue;
    }

    try {
      const { signals: socialSignals, totalCostUsd } = await searchCompetitorMentions(ws.competitors);

      if (socialSignals.length > 0) {
        const written = await writeSignalEvents(socialSignals, ws.slug);
        totalSignalsWritten += written;
        processedWorkspaceSlugs.add(ws.slug);
      }

      if (totalCostUsd > 0) {
        // Charge the total Serper spend as a "social_mention" line item
        await incrementWorkspaceSpend(ws.slug, totalCostUsd, "social_mention");
      }
    } catch (error) {
      console.error(
        `[Cycle] Error running Serper social listening for workspace "${ws.slug}":`,
        error,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Step 6: Cycle summary
  // --------------------------------------------------------------------------
  const cycleDurationMs = Date.now() - cycleStart;
  console.log(
    `[Cycle] Cycle complete in ${cycleDurationMs}ms — ` +
    `signals written: ${totalSignalsWritten}, ` +
    `workspaces processed: ${processedWorkspaceSlugs.size}, ` +
    `budget caps hit: ${budgetCapsHit}`,
  );
}

