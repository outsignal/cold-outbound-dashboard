import { schedules } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { generateInsights } from "@/lib/insights/generate";
import { notifyWeeklyDigest } from "@/lib/notifications";
import { anthropicQueue } from "./queues";
import { progressWarmup } from "@/lib/linkedin/rate-limiter";
import { updateAcceptanceRate } from "@/lib/linkedin/sender";
import { recoverStuckActions, expireStaleActions } from "@/lib/linkedin/queue";

// PrismaClient at module scope — not inside run()
const prisma = new PrismaClient();

/**
 * Gather digest data for a workspace and send the weekly digest notification.
 * Replicated from src/app/api/cron/generate-insights/route.ts — uses module-scope prisma.
 */
async function sendDigestForWorkspace(workspaceSlug: string): Promise<void> {
  try {
    // Top 3 active insights by priority
    const topInsights = await prisma.insight.findMany({
      where: { workspaceSlug, status: "active" },
      orderBy: [{ priority: "asc" }, { generatedAt: "desc" }],
      take: 3,
      select: { observation: true, category: true, confidence: true },
    });

    // Best/worst campaign from latest campaign_snapshot
    const snapshots = await prisma.cachedMetrics.findMany({
      where: {
        workspace: workspaceSlug,
        metricType: "campaign_snapshot",
      },
      orderBy: { computedAt: "desc" },
    });

    // Get latest snapshot per campaign
    const latestByCampaign = new Map<
      string,
      { name: string; replyRate: number }
    >();
    for (const s of snapshots) {
      try {
        const data = JSON.parse(s.data) as {
          campaignName: string;
          replyRate: number;
        };
        if (!latestByCampaign.has(data.campaignName)) {
          latestByCampaign.set(data.campaignName, {
            name: data.campaignName,
            replyRate: data.replyRate,
          });
        }
      } catch {
        // skip unparseable
      }
    }

    const campaigns = Array.from(latestByCampaign.values());
    let bestCampaign: { name: string; replyRate: number } | null = null;
    let worstCampaign: { name: string; replyRate: number } | null = null;

    if (campaigns.length > 0) {
      campaigns.sort((a, b) => b.replyRate - a.replyRate);
      bestCampaign = campaigns[0];
      worstCampaign =
        campaigns.length > 1 ? campaigns[campaigns.length - 1] : null;
    }

    // Count all active insights for pending actions
    const pendingActions = await prisma.insight.count({
      where: { workspaceSlug, status: "active" },
    });

    // Reply count for the past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const replyCount = await prisma.reply.count({
      where: {
        workspaceSlug,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // Compute avg reply rate from campaigns
    let avgReplyRate: number | undefined;
    if (campaigns.length > 0) {
      const totalRate = campaigns.reduce((sum, c) => sum + c.replyRate, 0);
      avgReplyRate = Math.round((totalRate / campaigns.length) * 10) / 10;
    }

    await notifyWeeklyDigest({
      workspaceSlug,
      topInsights,
      bestCampaign,
      worstCampaign,
      pendingActions,
      replyCount,
      avgReplyRate,
      insightCount: pendingActions,
    });
  } catch (err) {
    console.error(
      `[generate-insights] Digest notification failed for ${workspaceSlug}:`,
      err,
    );
  }
}

export const generateInsightsTask = schedules.task({
  id: "generate-insights",
  cron: "0 */6 * * *", // every 6 hours
  queue: anthropicQueue,
  maxDuration: 300, // 5 min — all workspaces with AI insight generation
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 2_000,
    maxTimeoutInMs: 30_000,
  },

  run: async () => {
    const workspaces = await prisma.workspace.findMany({
      select: { slug: true },
    });

    console.log(
      `[generate-insights] Processing ${workspaces.length} workspaces`,
    );

    // Fan out across all workspaces in parallel — per-workspace error isolation
    const results = await Promise.all(
      workspaces.map(async (ws) => {
        try {
          const count = await generateInsights(ws.slug);
          await sendDigestForWorkspace(ws.slug);
          return {
            workspace: ws.slug,
            insightsGenerated: count,
            digestSent: true,
          };
        } catch (err) {
          return {
            workspace: ws.slug,
            insightsGenerated: 0,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );

    const totalInsights = results.reduce((s, r) => s + r.insightsGenerated, 0);
    const errors = results.filter((r) => "error" in r && r.error);

    console.log(
      `[generate-insights] Step 1 complete: ${totalInsights} total insights, ${errors.length} workspace errors`,
    );

    // -----------------------------------------------------------------------
    // Step 2: LinkedIn maintenance (merged from inbox-linkedin-maintenance)
    // Runs every 6h alongside insights — warmup progression, acceptance rates,
    // stuck/stale action recovery.
    // -----------------------------------------------------------------------
    console.log(`[generate-insights] Step 2: LinkedIn maintenance`);

    const activeSenders = await prisma.sender.findMany({
      where: { status: "active" },
      select: { id: true, name: true },
    });

    let warmupProcessed = 0;
    let warmupErrors = 0;

    // Sequential per-sender loop — safe default, per-sender DB queries
    for (const sender of activeSenders) {
      try {
        await progressWarmup(sender.id);
        warmupProcessed++;
      } catch (err) {
        warmupErrors++;
        console.error(`[generate-insights] progressWarmup failed for ${sender.name}:`, err);
      }
      try {
        await updateAcceptanceRate(sender.id);
      } catch (err) {
        console.error(`[generate-insights] updateAcceptanceRate failed for ${sender.name}:`, err);
      }
    }

    const stuckRecovered = await recoverStuckActions();
    const staleExpired = await expireStaleActions();

    console.log(
      `[generate-insights] Step 2 complete: warmup=${warmupProcessed}/${activeSenders.length}, errors=${warmupErrors}, stuck=${stuckRecovered}, expired=${staleExpired}`,
    );

    return {
      workspacesProcessed: workspaces.length,
      totalInsightsGenerated: totalInsights,
      digestsSent: workspaces.length - errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      linkedinMaintenance: {
        warmupProcessed,
        warmupErrors,
        stuckRecovered,
        staleExpired,
        totalSenders: activeSenders.length,
      },
    };
  },
});
