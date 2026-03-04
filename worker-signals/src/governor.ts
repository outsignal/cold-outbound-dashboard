// Per-workspace budget cap enforcement for signal processing.
//
// checkWorkspaceCap    — returns true if the workspace has hit its daily spend cap.
// incrementWorkspaceSpend — upserts SignalDailyCost, tracking spend + per-type breakdown.
// alertBudgetCapHit    — sends a Slack block kit alert when a workspace hits its cap.

import { prisma } from "./db.js";
import { WebClient } from "@slack/web-api";

// Lazy-init Slack client (only instantiated when first used)
let slackClient: WebClient | null = null;

function getSlackClient(): WebClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  if (!slackClient) {
    slackClient = new WebClient(token);
  }
  return slackClient;
}

/**
 * Get today's date in "YYYY-MM-DD" format (UTC).
 */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// checkWorkspaceCap
// ---------------------------------------------------------------------------

/**
 * Check whether a workspace has reached its daily signal spend cap.
 *
 * @param workspaceSlug - Workspace to check
 * @param capUsd        - Daily cap in USD (from workspace.signalDailyCapUsd)
 * @returns true if the cap has been hit (processing should stop for this workspace)
 */
export async function checkWorkspaceCap(
  workspaceSlug: string,
  capUsd: number,
): Promise<boolean> {
  const date = todayUtc();

  const record = await prisma.signalDailyCost.findUnique({
    where: {
      workspaceSlug_date: { workspaceSlug, date },
    },
  });

  return (record?.totalUsd ?? 0) >= capUsd;
}

// ---------------------------------------------------------------------------
// incrementWorkspaceSpend
// ---------------------------------------------------------------------------

/**
 * Record spend for a workspace's signal processing.
 * Upserts SignalDailyCost: increments totalUsd and updates the per-type breakdown.
 *
 * @param workspaceSlug - Workspace being charged
 * @param costUsd       - Amount to add in USD
 * @param signalType    - Signal type key for breakdown (e.g. "job_change", "social_mention")
 */
export async function incrementWorkspaceSpend(
  workspaceSlug: string,
  costUsd: number,
  signalType: string,
): Promise<void> {
  if (costUsd <= 0) return; // No-op for free calls (e.g. 404 from PredictLeads)

  const date = todayUtc();

  // Fetch current record to update breakdown JSON
  const existing = await prisma.signalDailyCost.findUnique({
    where: { workspaceSlug_date: { workspaceSlug, date } },
    select: { totalUsd: true, breakdown: true },
  });

  // Parse existing breakdown or start fresh
  let breakdown: Record<string, number> = {};
  if (existing?.breakdown) {
    try {
      breakdown = JSON.parse(existing.breakdown) as Record<string, number>;
    } catch {
      // Corrupt breakdown — start fresh
      breakdown = {};
    }
  }

  // Increment the signal type's running total
  breakdown[signalType] = (breakdown[signalType] ?? 0) + costUsd;

  const newTotal = (existing?.totalUsd ?? 0) + costUsd;

  await prisma.signalDailyCost.upsert({
    where: { workspaceSlug_date: { workspaceSlug, date } },
    create: {
      workspaceSlug,
      date,
      totalUsd: costUsd,
      breakdown: JSON.stringify(breakdown),
    },
    update: {
      totalUsd: newTotal,
      breakdown: JSON.stringify(breakdown),
    },
  });
}

// ---------------------------------------------------------------------------
// alertBudgetCapHit
// ---------------------------------------------------------------------------

/**
 * Send a Slack alert when a workspace hits its daily signal budget cap.
 * Silently skips if SLACK_BOT_TOKEN or ADMIN_SLACK_CHANNEL_ID is not set.
 *
 * @param workspaceSlug   - Workspace identifier
 * @param workspaceName   - Workspace display name (for the message)
 * @param capUsd          - Configured daily cap in USD
 * @param spentUsd        - Actual amount spent today (to show in the alert)
 */
export async function alertBudgetCapHit(
  workspaceSlug: string,
  workspaceName: string,
  capUsd: number,
  spentUsd: number,
): Promise<void> {
  const client = getSlackClient();
  if (!client) {
    console.warn(
      `[Governor] SLACK_BOT_TOKEN not set — skipping budget cap alert for ${workspaceSlug}`,
    );
    return;
  }

  const channelId = process.env.ADMIN_SLACK_CHANNEL_ID;
  if (!channelId) {
    console.warn(
      `[Governor] ADMIN_SLACK_CHANNEL_ID not set — skipping budget cap alert for ${workspaceSlug}`,
    );
    return;
  }

  try {
    await client.chat.postMessage({
      channel: channelId,
      text: `[${workspaceName}] Signal daily budget cap reached`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `[${workspaceName}] Signal daily budget cap reached`,
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Workspace:*\n${workspaceName} (\`${workspaceSlug}\`)`,
            },
            {
              type: "mrkdwn",
              text: `*Daily Cap:*\n$${capUsd.toFixed(2)} USD`,
            },
            {
              type: "mrkdwn",
              text: `*Spent Today:*\n$${spentUsd.toFixed(2)} USD`,
            },
            {
              type: "mrkdwn",
              text: `*Status:*\nSignal processing paused until midnight UTC`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    // Don't crash the cycle on Slack failures
    console.error(`[Governor] Failed to send budget cap Slack alert for ${workspaceSlug}:`, error);
  }
}
