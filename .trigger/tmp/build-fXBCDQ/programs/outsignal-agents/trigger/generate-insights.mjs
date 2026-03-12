import {
  notifyWeeklyDigest
} from "../../../chunk-JKWD7OVZ.mjs";
import "../../../chunk-OCSVRKXM.mjs";
import {
  anthropicQueue
} from "../../../chunk-FFUD2FLM.mjs";
import {
  anthropic,
  external_exports,
  generateObject
} from "../../../chunk-YS73E6WY.mjs";
import "../../../chunk-W7HBEXJ4.mjs";
import "../../../chunk-7W7UG4Z3.mjs";
import "../../../chunk-GS4UDRHQ.mjs";
import {
  prisma
} from "../../../chunk-6UNNRELO.mjs";
import {
  require_default
} from "../../../chunk-6DNKPBNV.mjs";
import {
  schedules_exports
} from "../../../chunk-LNHUL6B5.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/generate-insights.ts
init_esm();
var import_client = __toESM(require_default());

// src/lib/insights/generate.ts
init_esm();

// src/lib/insights/types.ts
init_esm();
var InsightSchema = external_exports.object({
  insights: external_exports.array(
    external_exports.object({
      category: external_exports.enum(["performance", "copy", "objections", "icp"]),
      observation: external_exports.string().describe(
        "Data-first finding, e.g. 'Reply rate dropped 40% this week across 3 campaigns'"
      ),
      evidence: external_exports.array(
        external_exports.object({
          metric: external_exports.string(),
          value: external_exports.string(),
          change: external_exports.string().nullable()
        })
      ),
      suggestedAction: external_exports.object({
        type: external_exports.enum([
          "pause_campaign",
          "update_icp_threshold",
          "flag_copy_review",
          "adjust_signal_targeting"
        ]),
        description: external_exports.string(),
        params: external_exports.record(external_exports.string(), external_exports.string()).nullable()
      }),
      confidence: external_exports.enum(["high", "medium", "low"]),
      priority: external_exports.number().min(1).max(10).describe("1 = highest priority, 10 = lowest")
    })
  ).min(1).max(5)
});

// src/lib/insights/dedup.ts
init_esm();
function buildDedupKey(category, actionType, targetEntityId) {
  return `${category}:${actionType}:${targetEntityId}`;
}
__name(buildDedupKey, "buildDedupKey");
async function filterDuplicates(insights, workspaceSlug) {
  if (insights.length === 0) return [];
  const keysMap = /* @__PURE__ */ new Map();
  for (const insight of insights) {
    const entityId = insight.suggestedAction.params?.campaignId ?? insight.suggestedAction.params?.campaignName ?? "global";
    const key = buildDedupKey(
      insight.category,
      insight.suggestedAction.type,
      entityId
    );
    keysMap.set(key, insight);
  }
  const candidateKeys = Array.from(keysMap.keys());
  const twoWeeksAgo = /* @__PURE__ */ new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const dismissed = await prisma.insight.findMany({
    where: {
      workspaceSlug,
      dedupKey: { in: candidateKeys },
      status: "dismissed",
      resolvedAt: { gte: twoWeeksAgo }
    },
    select: { dedupKey: true }
  });
  const dismissedKeys = new Set(dismissed.map((d) => d.dedupKey));
  return insights.filter((insight) => {
    const entityId = insight.suggestedAction.params?.campaignId ?? insight.suggestedAction.params?.campaignName ?? "global";
    const key = buildDedupKey(
      insight.category,
      insight.suggestedAction.type,
      entityId
    );
    return !dismissedKeys.has(key);
  });
}
__name(filterDuplicates, "filterDuplicates");

// src/lib/insights/generate.ts
async function generateInsights(workspaceSlug) {
  const twoWeeksAgo = /* @__PURE__ */ new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().slice(0, 10);
  const snapshots = await prisma.cachedMetrics.findMany({
    where: {
      workspace: workspaceSlug,
      metricType: "campaign_snapshot",
      date: { gte: twoWeeksAgoStr }
    },
    orderBy: { date: "desc" }
  });
  const campaignData = [];
  for (const s of snapshots) {
    try {
      campaignData.push({
        campaignId: s.metricKey,
        date: s.date,
        snapshot: JSON.parse(s.data)
      });
    } catch {
    }
  }
  const [intentCounts, sentimentCounts, objectionCounts] = await Promise.all([
    prisma.reply.groupBy({
      by: ["intent"],
      where: {
        workspaceSlug,
        receivedAt: { gte: twoWeeksAgo },
        intent: { not: null }
      },
      _count: { id: true }
    }),
    prisma.reply.groupBy({
      by: ["sentiment"],
      where: {
        workspaceSlug,
        receivedAt: { gte: twoWeeksAgo },
        sentiment: { not: null }
      },
      _count: { id: true }
    }),
    prisma.reply.groupBy({
      by: ["objectionSubtype"],
      where: {
        workspaceSlug,
        receivedAt: { gte: twoWeeksAgo },
        intent: "objection",
        objectionSubtype: { not: null }
      },
      _count: { id: true }
    })
  ]);
  const bodyElements = await prisma.cachedMetrics.findMany({
    where: {
      workspace: workspaceSlug,
      metricType: "body_elements"
    },
    take: 20
  });
  const oneWeekAgo = /* @__PURE__ */ new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toISOString().slice(0, 10);
  const thisWeekSnapshots = campaignData.filter((s) => s.date >= oneWeekAgoStr);
  const lastWeekSnapshots = campaignData.filter(
    (s) => s.date < oneWeekAgoStr && s.date >= twoWeeksAgoStr
  );
  const thisWeekAvg = computeAverageRates(thisWeekSnapshots);
  const lastWeekAvg = computeAverageRates(lastWeekSnapshots);
  const totalReplies = intentCounts.reduce((s, i) => s + i._count.id, 0);
  const prompt = buildPrompt({
    workspaceSlug,
    campaignData,
    intentCounts: intentCounts.map((i) => ({
      intent: i.intent ?? "unknown",
      count: i._count.id
    })),
    sentimentCounts: sentimentCounts.map((s) => ({
      sentiment: s.sentiment ?? "unknown",
      count: s._count.id
    })),
    objectionCounts: objectionCounts.map((o) => ({
      subtype: o.objectionSubtype ?? "unknown",
      count: o._count.id
    })),
    bodyElements: bodyElements.map((b) => {
      try {
        return { key: b.metricKey, data: JSON.parse(b.data) };
      } catch {
        return null;
      }
    }).filter(Boolean),
    thisWeekAvg,
    lastWeekAvg,
    totalReplies
  });
  if (campaignData.length === 0 && totalReplies === 0) {
    return 0;
  }
  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: InsightSchema,
    prompt
  });
  const filtered = await filterDuplicates(object.insights, workspaceSlug);
  if (filtered.length === 0) {
    return 0;
  }
  const insightsToCreate = filtered.map((insight) => {
    const entityId = insight.suggestedAction.params?.campaignId ?? insight.suggestedAction.params?.campaignName ?? "global";
    return {
      workspaceSlug,
      category: insight.category,
      observation: insight.observation,
      evidence: JSON.stringify(insight.evidence),
      confidence: insight.confidence,
      priority: insight.priority,
      actionType: insight.suggestedAction.type,
      actionDescription: insight.suggestedAction.description,
      actionParams: insight.suggestedAction.params ? JSON.stringify(insight.suggestedAction.params) : null,
      dedupKey: buildDedupKey(
        insight.category,
        insight.suggestedAction.type,
        entityId
      ),
      status: "active"
    };
  });
  await prisma.insight.createMany({ data: insightsToCreate });
  return insightsToCreate.length;
}
__name(generateInsights, "generateInsights");
function computeAverageRates(data) {
  if (data.length === 0) {
    return {
      replyRate: 0,
      openRate: 0,
      interestedRate: 0,
      bounceRate: 0,
      campaignCount: 0
    };
  }
  const latestByCampaign = /* @__PURE__ */ new Map();
  for (const d of data) {
    const name = d.snapshot.campaignName;
    if (!latestByCampaign.has(name)) {
      latestByCampaign.set(name, d.snapshot);
    }
  }
  const snapshots = Array.from(latestByCampaign.values());
  const count = snapshots.length;
  return {
    replyRate: Math.round(
      snapshots.reduce((s, c) => s + c.replyRate, 0) / count * 100
    ) / 100,
    openRate: Math.round(
      snapshots.reduce((s, c) => s + c.openRate, 0) / count * 100
    ) / 100,
    interestedRate: Math.round(
      snapshots.reduce((s, c) => s + c.interestedRate, 0) / count * 100
    ) / 100,
    bounceRate: Math.round(
      snapshots.reduce((s, c) => s + c.bounceRate, 0) / count * 100
    ) / 100,
    campaignCount: count
  };
}
__name(computeAverageRates, "computeAverageRates");
function buildPrompt(data) {
  const latestByCampaign = /* @__PURE__ */ new Map();
  for (const d of data.campaignData) {
    if (!latestByCampaign.has(d.snapshot.campaignName)) {
      latestByCampaign.set(d.snapshot.campaignName, {
        campaignId: d.campaignId,
        snapshot: d.snapshot
      });
    }
  }
  const campaignSummaries = Array.from(latestByCampaign.entries()).map(([name, { campaignId, snapshot: s }]) => {
    return `- ${name} (id: ${campaignId}): ${s.emailsSent} sent, ${s.replyRate}% reply rate, ${s.openRate}% open rate, ${s.interestedRate}% interested rate, ${s.bounceRate}% bounce rate, copy strategy: ${s.copyStrategy ?? "none"}, status: ${s.status}`;
  }).join("\n");
  const intentSummary = data.intentCounts.map((i) => `${i.intent}: ${i.count}`).join(", ");
  const sentimentSummary = data.sentimentCounts.map((s) => `${s.sentiment}: ${s.count}`).join(", ");
  const objectionSummary = data.objectionCounts.map((o) => `${o.subtype}: ${o.count}`).join(", ");
  const wowChanges = [];
  if (data.lastWeekAvg.campaignCount > 0 && data.thisWeekAvg.campaignCount > 0) {
    const rr = data.thisWeekAvg.replyRate - data.lastWeekAvg.replyRate;
    const or = data.thisWeekAvg.openRate - data.lastWeekAvg.openRate;
    const ir = data.thisWeekAvg.interestedRate - data.lastWeekAvg.interestedRate;
    const br = data.thisWeekAvg.bounceRate - data.lastWeekAvg.bounceRate;
    wowChanges.push(
      `Reply rate: ${data.thisWeekAvg.replyRate}% (${rr >= 0 ? "+" : ""}${rr.toFixed(2)}pp vs last week)`,
      `Open rate: ${data.thisWeekAvg.openRate}% (${or >= 0 ? "+" : ""}${or.toFixed(2)}pp vs last week)`,
      `Interested rate: ${data.thisWeekAvg.interestedRate}% (${ir >= 0 ? "+" : ""}${ir.toFixed(2)}pp vs last week)`,
      `Bounce rate: ${data.thisWeekAvg.bounceRate}% (${br >= 0 ? "+" : ""}${br.toFixed(2)}pp vs last week)`
    );
  }
  return `You are an outbound email campaign analyst. Analyze this workspace data and produce 3-5 actionable insights. Be direct and data-first — lead with numbers, not fluff.

WORKSPACE: ${data.workspaceSlug}
DATA PERIOD: Last 2 weeks
TOTAL REPLIES: ${data.totalReplies}

## Campaign Performance (latest snapshot per campaign)
${campaignSummaries || "No campaign data available."}

## Reply Intent Distribution
${intentSummary || "No reply data."}

## Reply Sentiment Distribution
${sentimentSummary || "No sentiment data."}

## Objection Patterns
${objectionSummary || "No objections recorded."}

## Week-over-Week Changes
${wowChanges.length > 0 ? wowChanges.join("\n") : "Not enough data for week-over-week comparison."}

## Body Element Data
${data.bodyElements.length > 0 ? data.bodyElements.map((b) => `${b.key}: ${JSON.stringify(b.data)}`).join("\n") : "No body element data."}

## Available Action Types
1. pause_campaign — Pause a specific campaign. Use when a campaign has critically poor performance (high bounce rate, very low engagement). Params: { campaignId: string }
2. update_icp_threshold — Change the ICP score threshold for a campaign. Use when ICP targeting seems too loose or too strict. Params: { campaignId: string, newThreshold: string (number as string) }
3. flag_copy_review — Flag a campaign's copy for review. Use when copy performance metrics suggest the messaging needs updating. Params: { campaignId: string }
4. adjust_signal_targeting — Adjust signal targeting parameters. Use when signal-based campaigns show targeting issues. Params: { campaignId: string }

## Confidence Guidelines
- HIGH: 50+ data points supporting the finding AND clear trend (>20% change)
- MEDIUM: 20-49 data points OR moderate trend (10-20% change)
- LOW: <20 data points OR marginal trend (<10% change)

Produce 3-5 insights. Each must include a specific observation with numbers, supporting evidence, a concrete suggested action from the 4 types above, confidence level, and priority (1=highest, 10=lowest).`;
}
__name(buildPrompt, "buildPrompt");

// trigger/generate-insights.ts
var prisma2 = new import_client.PrismaClient();
async function sendDigestForWorkspace(workspaceSlug) {
  try {
    const topInsights = await prisma2.insight.findMany({
      where: { workspaceSlug, status: "active" },
      orderBy: [{ priority: "asc" }, { generatedAt: "desc" }],
      take: 3,
      select: { observation: true, category: true, confidence: true }
    });
    const snapshots = await prisma2.cachedMetrics.findMany({
      where: {
        workspace: workspaceSlug,
        metricType: "campaign_snapshot"
      },
      orderBy: { computedAt: "desc" }
    });
    const latestByCampaign = /* @__PURE__ */ new Map();
    for (const s of snapshots) {
      try {
        const data = JSON.parse(s.data);
        if (!latestByCampaign.has(data.campaignName)) {
          latestByCampaign.set(data.campaignName, {
            name: data.campaignName,
            replyRate: data.replyRate
          });
        }
      } catch {
      }
    }
    const campaigns = Array.from(latestByCampaign.values());
    let bestCampaign = null;
    let worstCampaign = null;
    if (campaigns.length > 0) {
      campaigns.sort((a, b) => b.replyRate - a.replyRate);
      bestCampaign = campaigns[0];
      worstCampaign = campaigns.length > 1 ? campaigns[campaigns.length - 1] : null;
    }
    const pendingActions = await prisma2.insight.count({
      where: { workspaceSlug, status: "active" }
    });
    const sevenDaysAgo = /* @__PURE__ */ new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const replyCount = await prisma2.reply.count({
      where: {
        workspaceSlug,
        createdAt: { gte: sevenDaysAgo }
      }
    });
    let avgReplyRate;
    if (campaigns.length > 0) {
      const totalRate = campaigns.reduce((sum, c) => sum + c.replyRate, 0);
      avgReplyRate = Math.round(totalRate / campaigns.length * 10) / 10;
    }
    await notifyWeeklyDigest({
      workspaceSlug,
      topInsights,
      bestCampaign,
      worstCampaign,
      pendingActions,
      replyCount,
      avgReplyRate,
      insightCount: pendingActions
    });
  } catch (err) {
    console.error(
      `[generate-insights] Digest notification failed for ${workspaceSlug}:`,
      err
    );
  }
}
__name(sendDigestForWorkspace, "sendDigestForWorkspace");
var generateInsightsTask = schedules_exports.task({
  id: "generate-insights",
  cron: "0 */6 * * *",
  // every 6 hours
  queue: anthropicQueue,
  maxDuration: 300,
  // 5 min — all workspaces with AI insight generation
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 2e3,
    maxTimeoutInMs: 3e4
  },
  run: /* @__PURE__ */ __name(async () => {
    const workspaces = await prisma2.workspace.findMany({
      select: { slug: true }
    });
    console.log(
      `[generate-insights] Processing ${workspaces.length} workspaces`
    );
    const results = await Promise.all(
      workspaces.map(async (ws) => {
        try {
          const count = await generateInsights(ws.slug);
          await sendDigestForWorkspace(ws.slug);
          return {
            workspace: ws.slug,
            insightsGenerated: count,
            digestSent: true
          };
        } catch (err) {
          return {
            workspace: ws.slug,
            insightsGenerated: 0,
            error: err instanceof Error ? err.message : String(err)
          };
        }
      })
    );
    const totalInsights = results.reduce((s, r) => s + r.insightsGenerated, 0);
    const errors = results.filter((r) => "error" in r && r.error);
    console.log(
      `[generate-insights] Done: ${totalInsights} total insights, ${errors.length} workspace errors`
    );
    return {
      workspacesProcessed: workspaces.length,
      totalInsightsGenerated: totalInsights,
      digestsSent: workspaces.length - errors.length,
      results,
      errors: errors.length > 0 ? errors : void 0
    };
  }, "run")
});
export {
  generateInsightsTask
};
//# sourceMappingURL=generate-insights.mjs.map
