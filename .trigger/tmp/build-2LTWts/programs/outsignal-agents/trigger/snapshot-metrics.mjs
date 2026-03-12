import {
  getWorkspaceBySlug
} from "../../../chunk-FEDV5KV3.mjs";
import {
  anthropicQueue
} from "../../../chunk-V5FCZ2QB.mjs";
import {
  EmailBisonClient
} from "../../../chunk-HYVNS55X.mjs";
import {
  anthropic,
  generateText
} from "../../../chunk-QQDFUQQM.mjs";
import "../../../chunk-W7HBEXJ4.mjs";
import {
  prisma
} from "../../../chunk-6UNNRELO.mjs";
import {
  require_default
} from "../../../chunk-6DNKPBNV.mjs";
import {
  schedules_exports
} from "../../../chunk-ZD6M6VDX.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/snapshot-metrics.ts
init_esm();
var import_client2 = __toESM(require_default());

// src/lib/analytics/snapshot.ts
init_esm();
function todayUTC() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
__name(todayUTC, "todayUTC");
async function snapshotWorkspaceCampaigns(workspaceSlug) {
  const errors = [];
  let campaignsProcessed = 0;
  const wsConfig = await getWorkspaceBySlug(workspaceSlug);
  let ebCampaigns = [];
  if (wsConfig) {
    try {
      const client = new EmailBisonClient(wsConfig.apiToken);
      ebCampaigns = await client.getCampaigns();
    } catch (err) {
      errors.push(
        `Failed to fetch EmailBison campaigns: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  const localCampaigns = await prisma.campaign.findMany({
    where: { workspaceSlug },
    select: {
      id: true,
      name: true,
      emailBisonCampaignId: true,
      channels: true,
      copyStrategy: true,
      status: true
    }
  });
  const ebMap = /* @__PURE__ */ new Map();
  for (const eb of ebCampaigns) {
    ebMap.set(eb.id, eb);
  }
  const date = todayUTC();
  for (const campaign of localCampaigns) {
    try {
      const eb = campaign.emailBisonCampaignId ? ebMap.get(campaign.emailBisonCampaignId) : void 0;
      let channels = ["email"];
      try {
        channels = JSON.parse(campaign.channels);
      } catch {
      }
      const emailsSent = eb?.emails_sent ?? 0;
      const opened = eb?.opened ?? 0;
      const uniqueOpens = eb?.unique_opens ?? 0;
      const replied = eb?.replied ?? 0;
      const uniqueReplies = eb?.unique_replies ?? 0;
      const bounced = eb?.bounced ?? 0;
      const interested = eb?.interested ?? 0;
      const totalLeads = eb?.total_leads ?? 0;
      const totalLeadsContacted = eb?.total_leads_contacted ?? 0;
      const [
        connectionsSentCount,
        messagesSentCount,
        profileViewsCount,
        connectionsAcceptedCount
      ] = await Promise.all([
        prisma.linkedInAction.count({
          where: {
            workspaceSlug,
            campaignName: campaign.name,
            actionType: "connect",
            status: "complete"
          }
        }),
        prisma.linkedInAction.count({
          where: {
            workspaceSlug,
            campaignName: campaign.name,
            actionType: "message",
            status: "complete"
          }
        }),
        prisma.linkedInAction.count({
          where: {
            workspaceSlug,
            campaignName: campaign.name,
            actionType: "profile_view",
            status: "complete"
          }
        }),
        prisma.linkedInAction.count({
          where: {
            workspaceSlug,
            campaignName: campaign.name,
            actionType: "connect",
            status: "complete",
            result: { contains: '"accepted"' }
          }
        })
      ]);
      const replyStats = await prisma.reply.groupBy({
        by: ["intent"],
        where: { campaignId: campaign.id },
        _count: { id: true }
      });
      let classifiedReplies = 0;
      let interestedReplies = 0;
      let objectionReplies = 0;
      for (const stat of replyStats) {
        if (stat.intent !== null) {
          classifiedReplies += stat._count.id;
        }
        if (stat.intent === "interested" || stat.intent === "meeting_booked") {
          interestedReplies += stat._count.id;
        }
        if (stat.intent === "objection") {
          objectionReplies += stat._count.id;
        }
      }
      const stepGroups = await prisma.reply.groupBy({
        by: ["sequenceStep", "intent"],
        where: {
          campaignId: campaign.id,
          sequenceStep: { not: null }
        },
        _count: { id: true }
      });
      const stepMap = /* @__PURE__ */ new Map();
      for (const sg of stepGroups) {
        if (sg.sequenceStep === null) continue;
        const step = sg.sequenceStep;
        if (!stepMap.has(step)) {
          stepMap.set(step, { replied: 0, interestedCount: 0, objectionCount: 0 });
        }
        const entry = stepMap.get(step);
        entry.replied += sg._count.id;
        if (sg.intent === "interested" || sg.intent === "meeting_booked") {
          entry.interestedCount += sg._count.id;
        }
        if (sg.intent === "objection") {
          entry.objectionCount += sg._count.id;
        }
      }
      const stepStats = Array.from(
        stepMap.entries()
      ).sort(([a], [b]) => a - b).map(([step, data]) => ({
        step,
        channel: "email",
        // Step-level attribution is email-based (from Reply.sequenceStep)
        sent: 0,
        // Sent-per-step not available locally
        replied: data.replied,
        interestedCount: data.interestedCount,
        objectionCount: data.objectionCount
      }));
      const totalSent = emailsSent + connectionsSentCount + messagesSentCount;
      const replyRate = totalSent > 0 ? replied / totalSent * 100 : 0;
      const openRate = emailsSent > 0 ? uniqueOpens / emailsSent * 100 : 0;
      const bounceRate = emailsSent > 0 ? bounced / emailsSent * 100 : 0;
      const interestedRate = totalSent > 0 ? interested / totalSent * 100 : 0;
      const snapshot = {
        emailsSent,
        opened,
        uniqueOpens,
        replied,
        uniqueReplies,
        bounced,
        interested,
        totalLeads,
        totalLeadsContacted,
        linkedinConnectionsSent: connectionsSentCount,
        linkedinConnectionsAccepted: connectionsAcceptedCount,
        linkedinMessagesSent: messagesSentCount,
        linkedinProfileViews: profileViewsCount,
        classifiedReplies,
        interestedReplies,
        objectionReplies,
        stepStats,
        replyRate: Math.round(replyRate * 100) / 100,
        openRate: Math.round(openRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
        interestedRate: Math.round(interestedRate * 100) / 100,
        campaignName: campaign.name,
        channels,
        copyStrategy: campaign.copyStrategy,
        status: campaign.status
      };
      await prisma.cachedMetrics.upsert({
        where: {
          workspace_metricType_metricKey_date: {
            workspace: workspaceSlug,
            metricType: "campaign_snapshot",
            metricKey: campaign.id,
            date
          }
        },
        create: {
          workspace: workspaceSlug,
          metricType: "campaign_snapshot",
          metricKey: campaign.id,
          date,
          data: JSON.stringify(snapshot)
        },
        update: {
          data: JSON.stringify(snapshot),
          computedAt: /* @__PURE__ */ new Date()
        }
      });
      campaignsProcessed++;
    } catch (err) {
      errors.push(
        `Campaign ${campaign.name} (${campaign.id}): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return { campaignsProcessed, errors };
}
__name(snapshotWorkspaceCampaigns, "snapshotWorkspaceCampaigns");

// src/lib/analytics/strategy-detect.ts
init_esm();
var VALID_STRATEGIES = [
  "creative-ideas",
  "pvp",
  "one-liner",
  "custom"
];
var STRATEGY_DETECT_PROMPT = `Classify this cold email into one of these copy strategies:
- "creative-ideas": Opens with creative/unconventional ideas related to the prospect's business
- "pvp": Problem-Value-Proof structure (states a problem, offers value, provides proof/social proof)
- "one-liner": Ultra-short (1-3 sentences), direct ask with minimal preamble

Respond with ONLY the strategy name. If none match clearly, respond "custom".

Email body:
{body}`;
async function detectCopyStrategy(emailBody) {
  const prompt = STRATEGY_DETECT_PROMPT.replace("{body}", emailBody);
  const result = await generateText({
    model: anthropic("claude-haiku-4-5-20250315"),
    prompt
  });
  const raw = result.text.trim().toLowerCase();
  if (VALID_STRATEGIES.includes(raw)) {
    return raw;
  }
  for (const strategy of VALID_STRATEGIES) {
    if (raw.includes(strategy)) {
      return strategy;
    }
  }
  return "custom";
}
__name(detectCopyStrategy, "detectCopyStrategy");
async function backfillCopyStrategies(workspaceSlug) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      workspaceSlug,
      copyStrategy: null,
      emailSequence: { not: null }
    },
    select: {
      id: true,
      emailSequence: true
    }
  });
  let updated = 0;
  for (const campaign of campaigns) {
    if (!campaign.emailSequence) continue;
    try {
      const steps = JSON.parse(campaign.emailSequence);
      const firstStep = steps.find((s) => s.position === 1) ?? steps[0];
      if (!firstStep?.body) continue;
      const strategy = await detectCopyStrategy(firstStep.body);
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { copyStrategy: strategy }
      });
      updated++;
    } catch (err) {
      console.error(
        `[strategy-detect] Failed to classify campaign ${campaign.id}:`,
        err
      );
    }
  }
  return updated;
}
__name(backfillCopyStrategies, "backfillCopyStrategies");

// src/lib/analytics/body-elements.ts
init_esm();
import { createHash } from "crypto";
var EMPTY_ELEMENTS = {
  hasCtaType: false,
  ctaSubtype: null,
  hasProblemStatement: false,
  hasValueProposition: false,
  hasCaseStudy: false,
  hasSocialProof: false,
  hasPersonalization: false
};
var VALID_CTA_SUBTYPES = [
  "book_a_call",
  "reply_to_email",
  "visit_link",
  "download_resource"
];
var BODY_ELEMENTS_PROMPT = `Analyze this cold email body and identify which structural elements are present.

Respond with ONLY valid JSON matching this exact schema:
{
  "hasCtaType": boolean,
  "ctaSubtype": "book_a_call" | "reply_to_email" | "visit_link" | "download_resource" | null,
  "hasProblemStatement": boolean,
  "hasValueProposition": boolean,
  "hasCaseStudy": boolean,
  "hasSocialProof": boolean,
  "hasPersonalization": boolean
}

Element definitions:
- CTA type: Any call-to-action asking the reader to take a specific action
  - book_a_call: Scheduling a meeting/call/demo
  - reply_to_email: Asking for a reply or response
  - visit_link: Clicking a link to a resource
  - download_resource: Downloading a PDF/guide/whitepaper
- Problem statement: Identifies a specific pain point or challenge the reader faces
- Value proposition: States a clear benefit or outcome the sender can deliver
- Case study: References a specific client result with numbers or named company
- Social proof: Mentions logos, client count, testimonials, awards, or industry recognition (broader than case study)
- Personalization: References something specific to the reader's company, role, industry, or recent activity

Email body:
{body}`;
async function classifyBodyElements(emailBody) {
  if (!emailBody || emailBody.trim().length < 20) {
    return EMPTY_ELEMENTS;
  }
  const prompt = BODY_ELEMENTS_PROMPT.replace("{body}", emailBody);
  const result = await generateText({
    model: anthropic("claude-haiku-4-5-20250315"),
    prompt
  });
  try {
    const parsed = JSON.parse(result.text.trim());
    return {
      hasCtaType: Boolean(parsed.hasCtaType),
      ctaSubtype: VALID_CTA_SUBTYPES.includes(parsed.ctaSubtype) ? parsed.ctaSubtype : null,
      hasProblemStatement: Boolean(parsed.hasProblemStatement),
      hasValueProposition: Boolean(parsed.hasValueProposition),
      hasCaseStudy: Boolean(parsed.hasCaseStudy),
      hasSocialProof: Boolean(parsed.hasSocialProof),
      hasPersonalization: Boolean(parsed.hasPersonalization)
    };
  } catch {
    console.error(
      "[body-elements] Failed to parse LLM response:",
      result.text
    );
    return EMPTY_ELEMENTS;
  }
}
__name(classifyBodyElements, "classifyBodyElements");
function bodyHash(body) {
  return createHash("md5").update(body).digest("hex");
}
__name(bodyHash, "bodyHash");
async function classifyWorkspaceBodyElements(workspaceSlug) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      workspaceSlug,
      emailSequence: { not: null }
    },
    select: {
      id: true,
      emailSequence: true
    }
  });
  let classified = 0;
  let skipped = 0;
  const errors = [];
  for (const campaign of campaigns) {
    if (!campaign.emailSequence) continue;
    let steps;
    try {
      steps = JSON.parse(campaign.emailSequence);
    } catch {
      errors.push(
        `Campaign ${campaign.id}: failed to parse emailSequence JSON`
      );
      continue;
    }
    for (const step of steps) {
      if (!step.body) continue;
      const metricKey = `${campaign.id}:step:${step.position}`;
      const hash = bodyHash(step.body);
      try {
        const existing = await prisma.cachedMetrics.findUnique({
          where: {
            workspace_metricType_metricKey_date: {
              workspace: workspaceSlug,
              metricType: "body_elements",
              metricKey,
              date: ""
            }
          }
        });
        if (existing) {
          try {
            const existingData = JSON.parse(existing.data);
            if (existingData.bodyHash === hash) {
              skipped++;
              continue;
            }
          } catch {
          }
        }
        const elements = await classifyBodyElements(step.body);
        await prisma.cachedMetrics.upsert({
          where: {
            workspace_metricType_metricKey_date: {
              workspace: workspaceSlug,
              metricType: "body_elements",
              metricKey,
              date: ""
            }
          },
          create: {
            workspace: workspaceSlug,
            metricType: "body_elements",
            metricKey,
            date: "",
            data: JSON.stringify({ ...elements, bodyHash: hash })
          },
          update: {
            data: JSON.stringify({ ...elements, bodyHash: hash }),
            computedAt: /* @__PURE__ */ new Date()
          }
        });
        classified++;
      } catch (err) {
        errors.push(
          `Campaign ${campaign.id} step ${step.position}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }
  return { classified, skipped, errors };
}
__name(classifyWorkspaceBodyElements, "classifyWorkspaceBodyElements");

// trigger/snapshot-metrics.ts
var prisma2 = new import_client2.PrismaClient();
async function processWorkspace(slug) {
  const errors = [];
  const { campaignsProcessed, errors: snapshotErrors } = await snapshotWorkspaceCampaigns(slug);
  errors.push(...snapshotErrors);
  let strategiesBackfilled = 0;
  try {
    strategiesBackfilled = await backfillCopyStrategies(slug);
  } catch (err) {
    errors.push(
      `Strategy backfill failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  let elementsClassified = 0;
  let elementsSkipped = 0;
  try {
    const result = await classifyWorkspaceBodyElements(slug);
    elementsClassified = result.classified;
    elementsSkipped = result.skipped;
    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
  } catch (err) {
    errors.push(
      `Body element classification failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  return {
    workspace: slug,
    campaignsProcessed,
    strategiesBackfilled,
    elementsClassified,
    elementsSkipped,
    errors: errors.length > 0 ? errors : void 0
  };
}
__name(processWorkspace, "processWorkspace");
var snapshotMetrics = schedules_exports.task({
  id: "snapshot-metrics",
  cron: "0 0 * * *",
  // daily at midnight UTC
  queue: anthropicQueue,
  maxDuration: 300,
  // 5 min — all workspaces with AI classification
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
      `[snapshot-metrics] Processing ${workspaces.length} workspaces`
    );
    const results = await Promise.all(
      workspaces.map(async (ws) => {
        try {
          return { ok: true, ...await processWorkspace(ws.slug) };
        } catch (err) {
          return {
            ok: false,
            workspace: ws.slug,
            error: err instanceof Error ? err.message : String(err)
          };
        }
      })
    );
    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    console.log(
      `[snapshot-metrics] Done: ${succeeded} succeeded, ${failed} failed out of ${workspaces.length} workspaces`
    );
    return { workspacesProcessed: results.length, results };
  }, "run")
});
export {
  snapshotMetrics
};
//# sourceMappingURL=snapshot-metrics.mjs.map
