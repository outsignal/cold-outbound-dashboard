/**
 * Postmaster Tools alerting -- fires Slack notifications on concerning metrics.
 */

import { audited } from "@/lib/notification-audit";
import { postMessage } from "@/lib/slack";
import { verifySlackChannel } from "@/lib/notification-guard";
import type { KnownBlock } from "@slack/web-api";

const LOG_PREFIX = "[postmaster-alerts]";

// Thresholds from Google's sender guidelines
const SPAM_RATE_WARNING = 0.001; // 0.1% -- Google's recommended max
const SPAM_RATE_CRITICAL = 0.003; // 0.3% -- action required
const BAD_REPUTATIONS = ["LOW", "BAD"];

function getAlertsChannelId(): string | null {
  return process.env.ALERTS_SLACK_CHANNEL_ID ?? null;
}

export interface PostmasterAlertInput {
  domain: string;
  date: string;
  spamRate: number | null;
  domainReputation: string | null;
  spfSuccessRatio: number | null;
  dkimSuccessRatio: number | null;
  dmarcSuccessRatio: number | null;
}

interface AlertResult {
  domain: string;
  alerts: string[];
}

/**
 * Check Postmaster stats and send alerts for concerning metrics.
 */
export async function checkAndAlert(stats: PostmasterAlertInput): Promise<AlertResult> {
  const alerts: string[] = [];
  const { domain, date, spamRate, domainReputation, spfSuccessRatio, dkimSuccessRatio, dmarcSuccessRatio } = stats;

  const alertsChannelId = getAlertsChannelId();
  if (!alertsChannelId) {
    console.warn(`${LOG_PREFIX} ALERTS_SLACK_CHANNEL_ID not set, skipping alerts`);
    return { domain, alerts };
  }

  if (!verifySlackChannel(alertsChannelId, "admin", "postmaster-alerts")) {
    return { domain, alerts };
  }

  // Spam rate alerts
  if (spamRate !== null) {
    if (spamRate >= SPAM_RATE_CRITICAL) {
      alerts.push("spam_rate_critical");
      const headerText = `Critical Spam Rate: ${domain}`;
      const blocks: KnownBlock[] = [
        {
          type: "header",
          text: { type: "plain_text", text: `Critical Spam Rate: ${domain}` },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Domain:*\n${domain}` },
            { type: "mrkdwn", text: `*Date:*\n${date}` },
            { type: "mrkdwn", text: `*Spam Rate:*\n${(spamRate * 100).toFixed(2)}%` },
            { type: "mrkdwn", text: `*Threshold:*\n${(SPAM_RATE_CRITICAL * 100).toFixed(1)}%` },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Action required:* Pause campaigns on this domain. Review recent email content and targeting.",
          },
        },
      ];
      try {
        await audited(
          {
            notificationType: "postmaster_spam_critical",
            channel: "slack",
            recipient: alertsChannelId,
            metadata: { domain, date, spamRate },
          },
          () => postMessage(alertsChannelId, headerText, blocks),
        );
      } catch (err) {
        console.error(`${LOG_PREFIX} Failed to send spam rate critical alert for ${domain}:`, err);
      }
    } else if (spamRate >= SPAM_RATE_WARNING) {
      alerts.push("spam_rate_warning");
      const headerText = `Elevated Spam Rate: ${domain}`;
      const blocks: KnownBlock[] = [
        {
          type: "header",
          text: { type: "plain_text", text: `Elevated Spam Rate: ${domain}` },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Domain:*\n${domain}` },
            { type: "mrkdwn", text: `*Date:*\n${date}` },
            { type: "mrkdwn", text: `*Spam Rate:*\n${(spamRate * 100).toFixed(3)}%` },
            { type: "mrkdwn", text: `*Threshold:*\n${(SPAM_RATE_WARNING * 100).toFixed(1)}%` },
          ],
        },
      ];
      try {
        await audited(
          {
            notificationType: "postmaster_spam_warning",
            channel: "slack",
            recipient: alertsChannelId,
            metadata: { domain, date, spamRate },
          },
          () => postMessage(alertsChannelId, headerText, blocks),
        );
      } catch (err) {
        console.error(`${LOG_PREFIX} Failed to send spam rate warning alert for ${domain}:`, err);
      }
    }
  }

  // Domain reputation alerts
  if (domainReputation && BAD_REPUTATIONS.includes(domainReputation)) {
    alerts.push(`reputation_${domainReputation.toLowerCase()}`);
    const headerText = `Domain Reputation ${domainReputation}: ${domain}`;
    const blocks: KnownBlock[] = [
      {
        type: "header",
        text: { type: "plain_text", text: `Domain Reputation ${domainReputation}: ${domain}` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Domain:*\n${domain}` },
          { type: "mrkdwn", text: `*Date:*\n${date}` },
          { type: "mrkdwn", text: `*Reputation:*\n${domainReputation}` },
        ],
      },
    ];
    try {
      await audited(
        {
          notificationType: "postmaster_reputation_drop",
          channel: "slack",
          recipient: alertsChannelId,
          metadata: { domain, date, domainReputation },
        },
        () => postMessage(alertsChannelId, headerText, blocks),
      );
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to send reputation alert for ${domain}:`, err);
    }
  }

  // Auth failure alerts (SPF/DKIM/DMARC below 95%)
  const authChecks = [
    { name: "SPF", ratio: spfSuccessRatio },
    { name: "DKIM", ratio: dkimSuccessRatio },
    { name: "DMARC", ratio: dmarcSuccessRatio },
  ];

  const failingAuth = authChecks.filter((c) => c.ratio !== null && c.ratio < 0.95);
  if (failingAuth.length > 0) {
    alerts.push("auth_failures");
    const headerText = `Auth Pass Rate Low: ${domain}`;
    const blocks: KnownBlock[] = [
      {
        type: "header",
        text: { type: "plain_text", text: `Auth Pass Rate Low: ${domain}` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Domain:*\n${domain}` },
          { type: "mrkdwn", text: `*Date:*\n${date}` },
          ...failingAuth.map((c) => ({
            type: "mrkdwn" as const,
            text: `*${c.name}:*\n${((c.ratio ?? 0) * 100).toFixed(1)}% (< 95%)`,
          })),
        ],
      },
    ];
    try {
      await audited(
        {
          notificationType: "postmaster_auth_failure",
          channel: "slack",
          recipient: alertsChannelId,
          metadata: { domain, date, failingAuth: failingAuth.map((c) => ({ name: c.name, ratio: c.ratio })) },
        },
        () => postMessage(alertsChannelId, headerText, blocks),
      );
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to send auth failure alert for ${domain}:`, err);
    }
  }

  return { domain, alerts };
}
