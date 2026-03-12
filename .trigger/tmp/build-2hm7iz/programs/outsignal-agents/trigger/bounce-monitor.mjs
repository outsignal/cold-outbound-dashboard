import {
  EmailBisonClient
} from "../../../chunk-HYVNS55X.mjs";
import {
  sendNotificationEmail
} from "../../../chunk-HSFGK6GU.mjs";
import "../../../chunk-OCSVRKXM.mjs";
import {
  audited,
  verifyEmailRecipients,
  verifySlackChannel
} from "../../../chunk-OEORPP6A.mjs";
import {
  postMessage
} from "../../../chunk-ZVMQUHPG.mjs";
import "../../../chunk-ABIDEUR4.mjs";
import "../../../chunk-HBS74KVJ.mjs";
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

// trigger/bounce-monitor.ts
init_esm();
var import_client2 = __toESM(require_default());

// src/lib/domain-health/bounce-monitor.ts
init_esm();
var LOG_PREFIX = "[bounce-monitor]";
var EMAILBISON_MGMT_ENABLED = process.env.EMAILBISON_SENDER_MGMT_ENABLED === "true";
var CONSECUTIVE_CHECKS_FOR_STEPDOWN = 6;
function computeEmailBounceStatus(bounceRate, isBlacklisted) {
  if (isBlacklisted) return "critical";
  if (bounceRate === null) return null;
  if (bounceRate >= 0.05) return "critical";
  if (bounceRate >= 0.03) return "warning";
  if (bounceRate >= 0.02) return "elevated";
  return "healthy";
}
__name(computeEmailBounceStatus, "computeEmailBounceStatus");
function stepDownThreshold(currentStatus) {
  switch (currentStatus) {
    case "critical":
      return 0.05;
    case "warning":
      return 0.03;
    case "elevated":
      return 0.02;
    case "healthy":
      return 0;
  }
}
__name(stepDownThreshold, "stepDownThreshold");
function stepDown(status) {
  switch (status) {
    case "critical":
      return "warning";
    case "warning":
      return "elevated";
    case "elevated":
      return "healthy";
    case "healthy":
      return "healthy";
  }
}
__name(stepDown, "stepDown");
function statusSeverity(status) {
  switch (status) {
    case "healthy":
      return 0;
    case "elevated":
      return 1;
    case "warning":
      return 2;
    case "critical":
      return 3;
  }
}
__name(statusSeverity, "statusSeverity");
async function evaluateSender(params) {
  const { sender, bounceRate, isBlacklisted } = params;
  const newStatus = computeEmailBounceStatus(bounceRate, isBlacklisted);
  if (newStatus === null) {
    console.log(`${LOG_PREFIX} Skipping ${sender.emailAddress} — no bounce data`);
    return { transitioned: false };
  }
  const currentStatus = sender.emailBounceStatus;
  const currentSeverity = statusSeverity(currentStatus);
  const newSeverity = statusSeverity(newStatus);
  if (newSeverity > currentSeverity) {
    const reason = isBlacklisted ? "blacklist" : "bounce_rate";
    const bouncePctDisplay = bounceRate !== null ? (bounceRate * 100).toFixed(1) : "n/a";
    const detail = isBlacklisted ? `Domain blacklisted — escalated to ${newStatus}` : `Bounce rate ${bouncePctDisplay}% — escalated to ${newStatus}`;
    let action;
    if (EMAILBISON_MGMT_ENABLED && sender.emailBisonSenderId !== null) {
      const ebClient = new EmailBisonClient(process.env.EMAILBISON_API_TOKEN ?? "");
      if (newStatus === "warning") {
        try {
          const senderEmails = await ebClient.getSenderEmails();
          const senderEmail = senderEmails.find((s) => s.id === sender.emailBisonSenderId);
          const currentLimit = senderEmail?.daily_limit ?? 100;
          const limitToStore = sender.originalDailyLimit ?? currentLimit;
          await prisma.sender.update({
            where: { id: sender.id },
            data: { originalDailyLimit: limitToStore }
          });
          const reducedLimit = Math.max(1, Math.floor(currentLimit / 2));
          await ebClient.patchSenderEmail(sender.emailBisonSenderId, { daily_limit: reducedLimit });
          action = "daily_limit_reduced";
          console.log(`${LOG_PREFIX} ${sender.emailAddress}: reduced daily limit from ${currentLimit} to ${reducedLimit}`);
        } catch (err) {
          console.error(`${LOG_PREFIX} Failed to reduce daily limit for ${sender.emailAddress}:`, err);
        }
      } else if (newStatus === "critical") {
        try {
          const senderEmails = await ebClient.getSenderEmails();
          const senderEmail = senderEmails.find((s) => s.id === sender.emailBisonSenderId);
          if (senderEmail) {
            const currentLimit = senderEmail.daily_limit ?? 100;
            const currentWarmup = senderEmail.warmup_enabled ?? true;
            const limitToStore = sender.originalDailyLimit ?? currentLimit;
            await prisma.sender.update({
              where: { id: sender.id },
              data: {
                originalDailyLimit: limitToStore,
                originalWarmupEnabled: currentWarmup
              }
            });
            await ebClient.patchSenderEmail(sender.emailBisonSenderId, {
              daily_limit: 1,
              warmup_enabled: isBlacklisted ? false : currentWarmup
            });
            const activeCampaigns = (senderEmail.campaigns ?? []).filter(
              (c) => c.status === "active"
            );
            let redistributedCount = 0;
            for (const campaign of activeCampaigns) {
              try {
                await ebClient.pauseCampaign(campaign.id);
                await ebClient.resumeCampaign(campaign.id);
                redistributedCount++;
                console.log(`${LOG_PREFIX} ${sender.emailAddress}: pause/unpause campaign "${campaign.name}" (${campaign.id}) to trigger redistribution`);
              } catch (campaignErr) {
                console.error(`${LOG_PREFIX} Failed to pause/unpause campaign ${campaign.id} for ${sender.emailAddress}:`, campaignErr);
                try {
                  await ebClient.resumeCampaign(campaign.id);
                } catch {
                }
              }
            }
            action = redistributedCount > 0 ? "critical_remediation_complete" : "critical_daily_limit_reduced";
            console.log(
              `${LOG_PREFIX} ${sender.emailAddress}: CRITICAL remediation — daily_limit=1, pause/unpause ${redistributedCount} campaigns for redistribution` + (isBlacklisted ? ", warmup disabled (blacklisted)" : "")
            );
          }
        } catch (err) {
          console.error(`${LOG_PREFIX} Critical remediation failed for ${sender.emailAddress}:`, err);
          action = "critical_remediation_failed";
        }
      }
    }
    await prisma.$transaction([
      prisma.sender.update({
        where: { id: sender.id },
        data: {
          emailBounceStatus: newStatus,
          emailBounceStatusAt: /* @__PURE__ */ new Date(),
          consecutiveHealthyChecks: 0
        }
      }),
      prisma.emailHealthEvent.create({
        data: {
          senderEmail: sender.emailAddress,
          senderDomain: sender.emailAddress.split("@")[1] ?? "",
          workspaceSlug: sender.workspaceSlug,
          fromStatus: currentStatus,
          toStatus: newStatus,
          reason,
          bouncePct: bounceRate,
          detail,
          senderId: sender.id
        }
      })
    ]);
    console.log(`${LOG_PREFIX} ${sender.emailAddress}: ${currentStatus} → ${newStatus} (${reason})`);
    return { transitioned: true, from: currentStatus, to: newStatus, reason, action };
  }
  if (currentStatus === "healthy") {
    return { transitioned: false };
  }
  const threshold = stepDownThreshold(currentStatus);
  const isBelowThreshold = bounceRate !== null && bounceRate < threshold;
  if (isBelowThreshold) {
    const newCount = sender.consecutiveHealthyChecks + 1;
    if (newCount >= CONSECUTIVE_CHECKS_FOR_STEPDOWN) {
      const stepDownStatus = stepDown(currentStatus);
      let action;
      if (currentStatus === "warning" && EMAILBISON_MGMT_ENABLED && sender.emailBisonSenderId !== null && sender.originalDailyLimit !== null) {
        try {
          const ebClient = new EmailBisonClient(process.env.EMAILBISON_API_TOKEN ?? "");
          await ebClient.patchSenderEmail(sender.emailBisonSenderId, { daily_limit: sender.originalDailyLimit });
          action = "daily_limit_restored";
          console.log(`${LOG_PREFIX} ${sender.emailAddress}: restored daily limit to ${sender.originalDailyLimit}`);
        } catch (err) {
          console.error(`${LOG_PREFIX} Failed to restore daily limit for ${sender.emailAddress}:`, err);
        }
      }
      if (currentStatus === "critical" && EMAILBISON_MGMT_ENABLED && sender.emailBisonSenderId !== null) {
        try {
          const ebClient = new EmailBisonClient(process.env.EMAILBISON_API_TOKEN ?? "");
          const restoreLimit = sender.originalDailyLimit ?? 100;
          const restoreWarmup = sender.originalWarmupEnabled ?? true;
          await ebClient.patchSenderEmail(sender.emailBisonSenderId, {
            daily_limit: restoreLimit,
            warmup_enabled: restoreWarmup
          });
          action = "critical_recovery_complete";
          console.log(
            `${LOG_PREFIX} ${sender.emailAddress}: recovery from critical — daily_limit=${restoreLimit}, warmup=${restoreWarmup}`
          );
        } catch (err) {
          console.error(`${LOG_PREFIX} Failed to restore settings for ${sender.emailAddress}:`, err);
        }
      }
      const bouncePctDisplay = bounceRate !== null ? (bounceRate * 100).toFixed(1) : "n/a";
      await prisma.$transaction([
        prisma.sender.update({
          where: { id: sender.id },
          data: {
            emailBounceStatus: stepDownStatus,
            emailBounceStatusAt: /* @__PURE__ */ new Date(),
            consecutiveHealthyChecks: 0,
            // Clear stored recovery fields after restoring
            ...currentStatus === "critical" ? {
              originalDailyLimit: null,
              originalWarmupEnabled: null,
              removedFromCampaignIds: null
            } : {},
            ...currentStatus === "warning" ? { originalDailyLimit: null } : {}
          }
        }),
        prisma.emailHealthEvent.create({
          data: {
            senderEmail: sender.emailAddress,
            senderDomain: sender.emailAddress.split("@")[1] ?? "",
            workspaceSlug: sender.workspaceSlug,
            fromStatus: currentStatus,
            toStatus: stepDownStatus,
            reason: "step_down",
            bouncePct: bounceRate,
            detail: `Bounce rate ${bouncePctDisplay}% sustained below threshold for ${newCount} checks — stepped down`,
            senderId: sender.id
          }
        })
      ]);
      console.log(`${LOG_PREFIX} ${sender.emailAddress}: step-down ${currentStatus} → ${stepDownStatus} (${newCount} consecutive healthy checks)`);
      return { transitioned: true, from: currentStatus, to: stepDownStatus, reason: "step_down", action };
    } else {
      await prisma.sender.update({
        where: { id: sender.id },
        data: { consecutiveHealthyChecks: newCount }
      });
      console.log(`${LOG_PREFIX} ${sender.emailAddress}: below threshold (${newCount}/${CONSECUTIVE_CHECKS_FOR_STEPDOWN} healthy checks)`);
      return { transitioned: false };
    }
  } else {
    await prisma.sender.update({
      where: { id: sender.id },
      data: { consecutiveHealthyChecks: 0 }
    });
    return { transitioned: false };
  }
}
__name(evaluateSender, "evaluateSender");
async function runBounceMonitor() {
  console.log(`${LOG_PREFIX} Starting bounce monitor run`);
  const senders = await prisma.sender.findMany({
    where: {
      emailAddress: { not: null },
      status: { not: "disabled" }
    },
    select: {
      id: true,
      emailAddress: true,
      workspaceSlug: true,
      emailBounceStatus: true,
      consecutiveHealthyChecks: true,
      emailBisonSenderId: true,
      originalDailyLimit: true,
      originalWarmupEnabled: true,
      removedFromCampaignIds: true
    }
  });
  console.log(`${LOG_PREFIX} Found ${senders.length} senders to evaluate`);
  const senderEmails = senders.map((s) => s.emailAddress);
  const senderDomains = [...new Set(senders.map((s) => s.emailAddress.split("@")[1] ?? ""))];
  const snapshots = await Promise.all(
    senderEmails.map(
      (email) => prisma.bounceSnapshot.findFirst({
        where: { senderEmail: email },
        orderBy: { snapshotDate: "desc" },
        select: { senderEmail: true, bounceRate: true }
      })
    )
  );
  const domainHealthRecords = await prisma.domainHealth.findMany({
    where: { domain: { in: senderDomains } },
    select: { domain: true, blacklistSeverity: true }
  });
  const bounceRateByEmail = /* @__PURE__ */ new Map();
  for (const snap of snapshots) {
    if (snap) bounceRateByEmail.set(snap.senderEmail, snap.bounceRate ?? null);
  }
  const isBlacklistedByDomain = /* @__PURE__ */ new Map();
  for (const dh of domainHealthRecords) {
    isBlacklistedByDomain.set(dh.domain, dh.blacklistSeverity === "critical");
  }
  let evaluated = 0;
  let transitioned = 0;
  let skipped = 0;
  const transitions = [];
  for (const sender of senders) {
    const email = sender.emailAddress;
    const domain = email.split("@")[1] ?? "";
    const bounceRate = bounceRateByEmail.get(email) ?? null;
    const isBlacklisted = isBlacklistedByDomain.get(domain) ?? false;
    try {
      const result = await evaluateSender({
        sender: { ...sender, emailAddress: email },
        bounceRate,
        isBlacklisted
      });
      evaluated++;
      if (result.transitioned && result.from !== void 0 && result.to !== void 0) {
        transitioned++;
        transitions.push({
          senderEmail: email,
          workspaceSlug: sender.workspaceSlug,
          from: result.from,
          to: result.to,
          reason: result.reason ?? "unknown",
          action: result.action
        });
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Error evaluating sender ${email}:`, err);
      skipped++;
    }
  }
  console.log(`${LOG_PREFIX} Run complete — evaluated: ${evaluated}, transitioned: ${transitioned}, skipped: ${skipped}`);
  return { evaluated, transitioned, skipped, transitions };
}
__name(runBounceMonitor, "runBounceMonitor");
async function replaceSender(params) {
  const { criticalSender } = params;
  const candidates = await prisma.sender.findMany({
    where: {
      workspaceSlug: criticalSender.workspaceSlug,
      emailBounceStatus: "healthy",
      status: "active",
      emailAddress: { not: null },
      id: { not: criticalSender.id }
    },
    select: { id: true, emailAddress: true }
  });
  if (candidates.length === 0) {
    return { replacementEmail: null, reason: "No healthy senders available in workspace" };
  }
  const candidateRates = await Promise.all(
    candidates.map(async (c) => {
      const snap = await prisma.bounceSnapshot.findFirst({
        where: { senderEmail: c.emailAddress },
        orderBy: { snapshotDate: "desc" },
        select: { bounceRate: true }
      });
      return { emailAddress: c.emailAddress, bounceRate: snap?.bounceRate ?? null };
    })
  );
  candidateRates.sort((a, b) => {
    if (a.bounceRate === null && b.bounceRate === null) return 0;
    if (a.bounceRate === null) return 1;
    if (b.bounceRate === null) return -1;
    return a.bounceRate - b.bounceRate;
  });
  const best = candidateRates[0];
  return {
    replacementEmail: best.emailAddress,
    reason: "Replaced with healthiest available sender"
  };
}
__name(replaceSender, "replaceSender");

// src/lib/domain-health/bounce-notifications.ts
init_esm();
var LOG_PREFIX2 = "[bounce-notifications]";
function getAlertsChannelId() {
  return process.env.ALERTS_SLACK_CHANNEL_ID ?? null;
}
__name(getAlertsChannelId, "getAlertsChannelId");
function getAdminEmail() {
  return process.env.ADMIN_EMAIL ?? null;
}
__name(getAdminEmail, "getAdminEmail");
function statusEmoji(status) {
  switch (status) {
    case "healthy":
      return ":large_green_circle:";
    case "elevated":
      return ":large_yellow_circle:";
    case "warning":
      return ":warning:";
    case "critical":
      return ":red_circle:";
    default:
      return ":white_circle:";
  }
}
__name(statusEmoji, "statusEmoji");
function statusLabel(status) {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "elevated":
      return "Elevated";
    case "warning":
      return "Warning";
    case "critical":
      return "Critical";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
__name(statusLabel, "statusLabel");
function isRecovery(fromStatus, toStatus) {
  const severity = {
    healthy: 0,
    elevated: 1,
    warning: 2,
    critical: 3
  };
  return (severity[toStatus] ?? 0) < (severity[fromStatus] ?? 0);
}
__name(isRecovery, "isRecovery");
function buildSlackMessage(params) {
  const {
    senderEmail,
    workspaceSlug,
    fromStatus,
    toStatus,
    reason,
    bouncePct,
    action,
    replacementEmail
  } = params;
  const emoji = statusEmoji(toStatus);
  const label = statusLabel(toStatus);
  const recovery = isRecovery(fromStatus, toStatus);
  const headerText = `${emoji} Sender Health ${recovery ? "Recovery" : "Alert"}: ${senderEmail}`;
  const bounceLine = bouncePct !== void 0 ? `
*Bounce rate:* ${(bouncePct * 100).toFixed(1)}%` : "";
  let actionLine = "";
  if (action === "daily_limit_reduced") {
    actionLine = "\n*Action taken:* Daily sending limit reduced by 50%";
  } else if (action === "campaign_removal_pending") {
    actionLine = "\n*Action taken:* Sender removed from active campaigns. Warmup remains active.";
  } else if (action === "daily_limit_restored") {
    actionLine = "\n*Action taken:* Daily sending limit restored to original value.";
  }
  let reasonLine = "";
  if (recovery) {
    reasonLine = `
*Recovery:* Sender recovered after sustained bounce rate below threshold.`;
  } else if (toStatus === "elevated") {
    reasonLine = `
*Recommended:* Monitor closely — bounce rate approaching warning threshold.`;
  } else if (reason === "blacklist") {
    reasonLine = `
*Reason:* Domain is blacklisted.`;
  } else {
    reasonLine = `
*Reason:* ${reason}`;
  }
  const mainText = `*Sender:* \`${senderEmail}\`
*Workspace:* ${workspaceSlug}
*Status:* ${statusLabel(fromStatus)} → *${label}*` + bounceLine + reasonLine + actionLine;
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Sender Health ${recovery ? "Recovery" : "Alert"}: ${senderEmail}`
      }
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: mainText }
    }
  ];
  if (toStatus === "critical" && !recovery) {
    const replacementText = replacementEmail ? `:white_check_mark: *Replacement sender available:* \`${replacementEmail}\`` : `:rotating_light: *No healthy replacement senders available — manual action required.*`;
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: replacementText }
    });
  }
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Checked at ${(/* @__PURE__ */ new Date()).toUTCString()}`
      }
    ]
  });
  return { headerText, blocks };
}
__name(buildSlackMessage, "buildSlackMessage");
function buildEmailHtml(params) {
  const {
    senderEmail,
    workspaceSlug,
    fromStatus,
    toStatus,
    bouncePct,
    action,
    replacementEmail
  } = params;
  const label = statusLabel(toStatus);
  const recovery = isRecovery(fromStatus, toStatus);
  const badgeColor = {
    healthy: "#16a34a",
    elevated: "#ca8a04",
    warning: "#d97706",
    critical: "#dc2626"
  };
  const color = badgeColor[toStatus] ?? "#71717a";
  const bounceLine = bouncePct !== void 0 ? `<tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;"><strong>Bounce Rate:</strong> ${(bouncePct * 100).toFixed(1)}%</td></tr>` : "";
  let actionHtml = "";
  if (action === "daily_limit_reduced") {
    actionHtml = `<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;margin:12px 0 0 0;"><strong>Action Taken:</strong> Daily sending limit has been reduced by 50% automatically.</p>`;
  } else if (action === "campaign_removal_pending") {
    actionHtml = `<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;margin:12px 0 0 0;"><strong>Action Taken:</strong> Sender removed from active campaigns. Warmup sequence remains active.</p>`;
  } else if (action === "daily_limit_restored") {
    actionHtml = `<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#16a34a;margin:12px 0 0 0;"><strong>Action Taken:</strong> Daily sending limit has been restored to the original value.</p>`;
  }
  let replacementHtml = "";
  if (toStatus === "critical" && !recovery) {
    replacementHtml = replacementEmail ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;margin:12px 0 0 0;"><strong>Replacement Sender:</strong> <code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;">${replacementEmail}</code></p>` : `<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#dc2626;font-weight:700;margin:12px 0 0 0;">No healthy replacement senders available — manual action required.</p>`;
  }
  const title = recovery ? `Sender Health Recovery: ${senderEmail}` : `Sender Health ${label}: ${senderEmail}`;
  const bodyContent = `
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3f3f46;margin:0 0 16px 0;">
      ${recovery ? `Sender <strong>${senderEmail}</strong> has recovered from <strong>${statusLabel(fromStatus)}</strong> to the status below.` : `Sender <strong>${senderEmail}</strong> in workspace <strong>${workspaceSlug}</strong> has transitioned to a new health status.`}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;">
          <strong>Status:</strong>
          <span style="display:inline-block;background-color:${color};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:6px;">${label.toUpperCase()}</span>
          <span style="margin-left:6px;color:#71717a;">(was: ${statusLabel(fromStatus)})</span>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;"><strong>Workspace:</strong> ${workspaceSlug}</td>
      </tr>
      ${bounceLine}
    </table>
    ${actionHtml}
    ${replacementHtml}
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a1a1aa;margin:16px 0 0 0;">
      Checked at ${(/* @__PURE__ */ new Date()).toUTCString()}
    </p>`;
  return buildEmailWrapper({ title, bodyContent });
}
__name(buildEmailHtml, "buildEmailHtml");
function buildEmailWrapper(params) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:#18181b;padding:20px 32px;border-radius:8px 8px 0 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;letter-spacing:3px;color:#F0FF7A;">OUTSIGNAL</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background-color:#ffffff;padding:32px 32px 24px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#18181b;padding-bottom:24px;line-height:1.3;">${params.title}</td>
              </tr>
              <tr>
                <td>${params.bodyContent}</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#fafafa;padding:20px 32px;border-top:1px solid #e4e4e7;border-radius:0 0 8px 8px;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a1a1aa;margin:0;line-height:1.5;">Outsignal Admin &mdash; Sender bounce health monitoring alert.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}
__name(buildEmailWrapper, "buildEmailWrapper");
async function notifyBounceRateTrend(params) {
  const {
    senderEmail,
    senderDomain,
    workspaceName,
    currentRate,
    previousRate,
    changePercent
  } = params;
  const alertsChannelId = getAlertsChannelId();
  if (!alertsChannelId) return;
  if (!verifySlackChannel(alertsChannelId, "admin", "notifyBounceRateTrend")) return;
  const headerText = `:chart_with_upwards_trend: Bounce Rate Rising: ${senderEmail}`;
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Bounce Rate Rising: ${senderEmail}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Sender:* \`${senderEmail}\`
*Domain:* ${senderDomain}
*Workspace:* ${workspaceName}
*Current:* ${(currentRate * 100).toFixed(1)}% — was ${(previousRate * 100).toFixed(1)}% (:arrow_up: ${Math.abs(changePercent).toFixed(1)}%)
3+ consecutive increases detected`
      }
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Trend detected at ${(/* @__PURE__ */ new Date()).toUTCString()}`
        }
      ]
    }
  ];
  try {
    await audited(
      {
        notificationType: "bounce_rate_trend_rising",
        channel: "slack",
        recipient: alertsChannelId,
        metadata: { senderEmail, senderDomain, workspaceName, currentRate, previousRate, changePercent }
      },
      () => postMessage(alertsChannelId, headerText, blocks)
    );
  } catch (err) {
    console.error(
      `${LOG_PREFIX2} Failed to send bounce rate trend notification for ${senderEmail}:`,
      err
    );
  }
}
__name(notifyBounceRateTrend, "notifyBounceRateTrend");
async function notifySenderHealthTransition(params) {
  const {
    senderEmail,
    workspaceSlug,
    fromStatus,
    toStatus,
    reason,
    bouncePct,
    action,
    replacementEmail,
    skipEmail = false
  } = params;
  const notificationType = `sender_health_${toStatus}`;
  const label = statusLabel(toStatus);
  const alertsChannelId = getAlertsChannelId();
  if (alertsChannelId) {
    if (verifySlackChannel(alertsChannelId, "admin", "notifySenderHealthTransition")) {
      const { headerText, blocks } = buildSlackMessage({
        senderEmail,
        workspaceSlug,
        fromStatus,
        toStatus,
        reason,
        bouncePct,
        action,
        replacementEmail
      });
      try {
        await audited(
          {
            notificationType,
            channel: "slack",
            recipient: alertsChannelId,
            metadata: { senderEmail, workspaceSlug, fromStatus, toStatus, reason }
          },
          () => postMessage(alertsChannelId, headerText, blocks)
        );
      } catch (err) {
        console.error(
          `${LOG_PREFIX2} Failed to send Slack notification for ${senderEmail} → ${toStatus}:`,
          err
        );
      }
    }
  }
  if (!skipEmail) {
    const adminEmail = getAdminEmail();
    if (adminEmail) {
      const verified = verifyEmailRecipients([adminEmail], "admin", "notifySenderHealthTransition");
      if (verified.length > 0) {
        const html = buildEmailHtml({
          senderEmail,
          workspaceSlug,
          fromStatus,
          toStatus,
          reason,
          bouncePct,
          action,
          replacementEmail
        });
        try {
          await audited(
            {
              notificationType,
              channel: "email",
              recipient: verified.join(","),
              metadata: { senderEmail, workspaceSlug, fromStatus, toStatus, reason }
            },
            () => sendNotificationEmail({
              to: verified,
              subject: `[Outsignal] Sender Health ${label}: ${senderEmail}`,
              html
            })
          );
        } catch (err) {
          console.error(
            `${LOG_PREFIX2} Failed to send email notification for ${senderEmail} → ${toStatus}:`,
            err
          );
        }
      }
    }
  }
}
__name(notifySenderHealthTransition, "notifySenderHealthTransition");
async function sendSenderHealthDigestEmail(items) {
  if (items.length === 0) return;
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;
  const verified = verifyEmailRecipients([adminEmail], "admin", "sendSenderHealthDigestEmail");
  if (verified.length === 0) return;
  const severityOrder = {
    critical: 0,
    warning: 1,
    elevated: 2,
    healthy: 3
  };
  const sorted = [...items].sort(
    (a, b) => (severityOrder[a.toStatus] ?? 4) - (severityOrder[b.toStatus] ?? 4)
  );
  const badgeColor = {
    healthy: "#16a34a",
    elevated: "#ca8a04",
    warning: "#d97706",
    critical: "#dc2626"
  };
  const rowsHtml = sorted.map((item) => {
    const color = badgeColor[item.toStatus] ?? "#71717a";
    const label = statusLabel(item.toStatus);
    const recovery = isRecovery(item.fromStatus, item.toStatus);
    const bounceTd = item.bouncePct !== void 0 ? `${(item.bouncePct * 100).toFixed(1)}%` : "—";
    let actionText = "";
    if (item.action === "daily_limit_reduced") {
      actionText = "Daily limit reduced 50%";
    } else if (item.action === "campaign_removal_pending") {
      actionText = "Removed from campaigns";
    } else if (item.action === "daily_limit_restored") {
      actionText = "Daily limit restored";
    }
    let replacementText = "";
    if (item.toStatus === "critical" && !recovery && item.replacementEmail) {
      replacementText = `<br/><span style="font-size:11px;color:#71717a;">Replacement: <code style="background:#f4f4f5;padding:1px 4px;border-radius:3px;">${item.replacementEmail}</code></span>`;
    } else if (item.toStatus === "critical" && !recovery && !item.replacementEmail) {
      replacementText = `<br/><span style="font-size:11px;color:#dc2626;font-weight:700;">No replacement available</span>`;
    }
    return `<tr style="border-bottom:1px solid #e4e4e7;">
        <td style="padding:8px 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;">
          <code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;">${item.senderEmail}</code>${replacementText}
        </td>
        <td style="padding:8px 4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#71717a;">${item.workspaceSlug}</td>
        <td style="padding:8px 4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#71717a;">${statusLabel(item.fromStatus)}</td>
        <td style="padding:8px 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
          <span style="display:inline-block;background-color:${color};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">${label.toUpperCase()}</span>
          ${recovery ? '<span style="margin-left:4px;font-size:11px;color:#16a34a;">&#x2191; Recovery</span>' : ""}
        </td>
        <td style="padding:8px 4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#3f3f46;">${bounceTd}</td>
        <td style="padding:8px 0 8px 4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#3f3f46;">${actionText || "—"}</td>
      </tr>`;
  }).join("");
  const hasCritical = items.some((i) => i.toStatus === "critical");
  const hasRecovery = items.some((i) => isRecovery(i.fromStatus, i.toStatus));
  let summaryNote = "";
  if (hasCritical) {
    summaryNote = `<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#dc2626;font-weight:700;margin:16px 0 0 0;">Critical senders require immediate attention.</p>`;
  }
  const title = `Sender Health Digest: ${items.length} Transition${items.length !== 1 ? "s" : ""}`;
  const bodyContent = `
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3f3f46;margin:0 0 16px 0;">
      ${items.length} sender${items.length !== 1 ? "s" : ""} changed health status during this bounce monitor run${hasRecovery ? " (includes recoveries)" : ""}.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr style="border-bottom:2px solid #e4e4e7;">
        <td style="padding:4px 8px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#71717a;text-transform:uppercase;">Sender</td>
        <td style="padding:4px 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#71717a;text-transform:uppercase;">Workspace</td>
        <td style="padding:4px 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#71717a;text-transform:uppercase;">Was</td>
        <td style="padding:4px 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#71717a;text-transform:uppercase;">Now</td>
        <td style="padding:4px 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#71717a;text-transform:uppercase;">Bounce %</td>
        <td style="padding:4px 0 4px 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#71717a;text-transform:uppercase;">Action</td>
      </tr>
      ${rowsHtml}
    </table>
    ${summaryNote}
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a1a1aa;margin:16px 0 0 0;">
      Checked at ${(/* @__PURE__ */ new Date()).toUTCString()}
    </p>`;
  const html = buildEmailWrapper({ title, bodyContent });
  try {
    await audited(
      {
        notificationType: "sender_health_digest",
        channel: "email",
        recipient: verified.join(","),
        metadata: { senders: items.length, hasCritical, hasRecovery }
      },
      () => sendNotificationEmail({
        to: verified,
        subject: `[Outsignal] Sender Health Digest: ${items.length} transition${items.length !== 1 ? "s" : ""}${hasCritical ? " (CRITICAL)" : ""}`,
        html
      })
    );
  } catch (err) {
    console.error(`${LOG_PREFIX2} Failed to send sender health digest email:`, err);
  }
}
__name(sendSenderHealthDigestEmail, "sendSenderHealthDigestEmail");

// src/lib/domain-health/trend-detection.ts
init_esm();
var LOG_PREFIX3 = "[trend-detection]";
var WINDOW_SIZE = 5;
var MIN_SNAPSHOTS = 3;
var NOISE_FLOOR = 0.02;
async function detectBounceRateTrend(senderEmail) {
  const snapshots = await prisma.bounceSnapshot.findMany({
    where: {
      senderEmail,
      bounceRate: { not: null }
    },
    orderBy: { snapshotDate: "desc" },
    take: WINDOW_SIZE,
    select: {
      bounceRate: true,
      snapshotDate: true
    }
  });
  const stableDefault = {
    trend: "stable",
    currentRate: snapshots[0]?.bounceRate ?? 0,
    previousRate: snapshots[1]?.bounceRate ?? snapshots[0]?.bounceRate ?? 0,
    changePercent: 0
  };
  if (snapshots.length < MIN_SNAPSHOTS) {
    console.log(
      `${LOG_PREFIX3} ${senderEmail}: only ${snapshots.length} snapshots — insufficient for trend detection`
    );
    return stableDefault;
  }
  const chronological = snapshots.slice(0, MIN_SNAPSHOTS).reverse();
  const rates = chronological.map((s) => s.bounceRate);
  const isRising = rates.every((rate, i) => i === 0 || rate > rates[i - 1]);
  const isFalling = rates.every((rate, i) => i === 0 || rate < rates[i - 1]);
  const currentRate = snapshots[0].bounceRate;
  const oldestInWindow = rates[0];
  const changePercent = oldestInWindow > 0 ? (currentRate - oldestInWindow) / oldestInWindow * 100 : currentRate > 0 ? 100 : 0;
  const trend = isRising ? "rising" : isFalling ? "falling" : "stable";
  console.log(
    `${LOG_PREFIX3} ${senderEmail}: trend=${trend}, current=${(currentRate * 100).toFixed(1)}%, oldest=${(oldestInWindow * 100).toFixed(1)}%, change=${changePercent.toFixed(1)}%`
  );
  return {
    trend,
    currentRate,
    previousRate: rates[rates.length - 2] ?? oldestInWindow,
    changePercent: Math.round(changePercent * 10) / 10
  };
}
__name(detectBounceRateTrend, "detectBounceRateTrend");
function shouldAlertOnTrend(result) {
  return result.trend === "rising" && result.currentRate >= NOISE_FLOOR;
}
__name(shouldAlertOnTrend, "shouldAlertOnTrend");

// src/lib/domain-health/reply-trend.ts
init_esm();
var LOG_PREFIX4 = "[reply-trend]";
var WINDOW_DAYS = 3;
var MIN_PREVIOUS_REPLIES = 3;
var DECLINE_THRESHOLD_PCT = 30;
var IMPROVE_THRESHOLD_PCT = 30;
async function detectReplyTrend(workspaceSlug, workspaceName) {
  const now = /* @__PURE__ */ new Date();
  const recentStart = new Date(now);
  recentStart.setDate(recentStart.getDate() - WINDOW_DAYS);
  const previousStart = new Date(recentStart);
  previousStart.setDate(previousStart.getDate() - WINDOW_DAYS);
  const [recentCount, previousCount] = await Promise.all([
    prisma.reply.count({
      where: {
        workspaceSlug,
        receivedAt: { gte: recentStart, lt: now }
      }
    }),
    prisma.reply.count({
      where: {
        workspaceSlug,
        receivedAt: { gte: previousStart, lt: recentStart }
      }
    })
  ]);
  let trend = "stable";
  let changePercent = 0;
  if (previousCount > 0) {
    changePercent = Math.round(
      (recentCount - previousCount) / previousCount * 100
    );
    if (changePercent <= -DECLINE_THRESHOLD_PCT) {
      trend = "declining";
    } else if (changePercent >= IMPROVE_THRESHOLD_PCT) {
      trend = "improving";
    }
  } else if (recentCount > 0) {
    trend = "improving";
    changePercent = 100;
  }
  return {
    workspaceSlug,
    workspaceName,
    trend,
    recentCount,
    previousCount,
    changePercent
  };
}
__name(detectReplyTrend, "detectReplyTrend");
async function runReplyTrendMonitor() {
  const workspaces = await prisma.workspace.findMany({
    where: { status: "active" },
    select: { slug: true, name: true }
  });
  const results = [];
  for (const ws of workspaces) {
    const result = await detectReplyTrend(ws.slug, ws.name);
    if (result.previousCount >= MIN_PREVIOUS_REPLIES || result.recentCount >= MIN_PREVIOUS_REPLIES) {
      results.push(result);
    }
  }
  const declining = results.filter((r) => r.trend === "declining");
  const improving = results.filter((r) => r.trend === "improving");
  const stable = results.filter((r) => r.trend === "stable").length;
  return {
    checked: workspaces.length,
    declining,
    improving,
    stable
  };
}
__name(runReplyTrendMonitor, "runReplyTrendMonitor");
function getAlertsChannelId2() {
  return process.env.ALERTS_SLACK_CHANNEL_ID ?? null;
}
__name(getAlertsChannelId2, "getAlertsChannelId");
async function notifyReplyTrendDecline(result) {
  const alertsChannelId = getAlertsChannelId2();
  if (!alertsChannelId) {
    console.warn(`${LOG_PREFIX4} ALERTS_SLACK_CHANNEL_ID not set, skipping notification`);
    return;
  }
  if (!verifySlackChannel(alertsChannelId, "admin", "notifyReplyTrendDecline")) {
    return;
  }
  const headerText = `:warning: Reply Rate Declining: ${result.workspaceName}`;
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Reply Rate Declining: ${result.workspaceName}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Workspace:* ${result.workspaceName} (\`${result.workspaceSlug}\`)
*Last ${WINDOW_DAYS} days:* ${result.recentCount} replies
*Previous ${WINDOW_DAYS} days:* ${result.previousCount} replies
*Change:* :chart_with_downwards_trend: ${result.changePercent}%`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":mag: *Possible causes:* inbox placement issues, domain reputation decline, content flagged as spam, or reduced campaign volume."
      }
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Checked at ${(/* @__PURE__ */ new Date()).toUTCString()}`
        }
      ]
    }
  ];
  try {
    await audited(
      {
        notificationType: "reply_trend_decline",
        channel: "slack",
        recipient: alertsChannelId,
        metadata: {
          workspaceSlug: result.workspaceSlug,
          recentCount: result.recentCount,
          previousCount: result.previousCount,
          changePercent: result.changePercent
        }
      },
      () => postMessage(alertsChannelId, headerText, blocks)
    );
  } catch (err) {
    console.error(
      `${LOG_PREFIX4} Failed to send Slack notification for ${result.workspaceSlug}:`,
      err
    );
  }
}
__name(notifyReplyTrendDecline, "notifyReplyTrendDecline");

// trigger/bounce-monitor.ts
var prisma2 = new import_client2.PrismaClient();
var LOG_PREFIX5 = "[bounce-monitor]";
var bounceMonitorTask = schedules_exports.task({
  id: "bounce-monitor",
  cron: "0 */4 * * *",
  // every 4 hours
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5e3,
    maxTimeoutInMs: 6e4
  },
  run: /* @__PURE__ */ __name(async () => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    console.log(`${LOG_PREFIX5} Starting bounce monitor run at ${timestamp}`);
    const result = await runBounceMonitor();
    const digestItems = [];
    for (const transition of result.transitions) {
      try {
        let replacementEmail = null;
        if (transition.to === "critical") {
          try {
            const replacement = await replaceSender({
              criticalSender: {
                id: "",
                // runBounceMonitor does not expose id; replaceSender finds by workspaceSlug
                emailAddress: transition.senderEmail,
                workspaceSlug: transition.workspaceSlug
              }
            });
            replacementEmail = replacement.replacementEmail;
          } catch (replErr) {
            console.error(
              `${LOG_PREFIX5} Failed to find replacement for ${transition.senderEmail}:`,
              replErr
            );
          }
        }
        await notifySenderHealthTransition({
          senderEmail: transition.senderEmail,
          workspaceSlug: transition.workspaceSlug,
          fromStatus: transition.from,
          toStatus: transition.to,
          reason: transition.reason,
          action: transition.action,
          replacementEmail,
          skipEmail: true
        });
        digestItems.push({
          senderEmail: transition.senderEmail,
          workspaceSlug: transition.workspaceSlug,
          fromStatus: transition.from,
          toStatus: transition.to,
          reason: transition.reason,
          action: transition.action,
          replacementEmail
        });
        if (transition.to === "warning" || transition.to === "critical") {
          try {
            const existing = await prisma2.insight.findFirst({
              where: {
                category: "deliverability",
                status: "active",
                workspaceSlug: transition.workspaceSlug,
                observation: { contains: transition.senderEmail }
              },
              select: { id: true }
            });
            if (!existing) {
              const dedupKey = `deliverability:${transition.to === "critical" ? "pause_sender" : "flag_copy_review"}:${transition.senderEmail}`;
              await prisma2.insight.create({
                data: {
                  category: "deliverability",
                  observation: `Sender ${transition.senderEmail} has reached ${transition.to} status — ${transition.reason}`,
                  evidence: JSON.stringify([
                    { metric: "senderEmail", value: transition.senderEmail, change: null },
                    { metric: "fromStatus", value: transition.from, change: null },
                    { metric: "toStatus", value: transition.to, change: transition.to },
                    { metric: "reason", value: transition.reason, change: null }
                  ]),
                  actionType: transition.to === "critical" ? "pause_sender" : "flag_copy_review",
                  actionDescription: transition.to === "critical" ? `Consider pausing ${transition.senderEmail} — bounce rate exceeds critical threshold` : `Monitor ${transition.senderEmail} closely — bounce rate is elevated`,
                  status: "active",
                  workspaceSlug: transition.workspaceSlug,
                  priority: transition.to === "critical" ? 1 : 2,
                  confidence: "high",
                  dedupKey
                }
              });
              console.log(
                `${LOG_PREFIX5} Created deliverability insight for ${transition.senderEmail} → ${transition.to}`
              );
            } else {
              console.log(
                `${LOG_PREFIX5} Skipped duplicate deliverability insight for ${transition.senderEmail} → ${transition.to}`
              );
            }
          } catch (insightErr) {
            console.error(
              `${LOG_PREFIX5} Failed to create deliverability insight for ${transition.senderEmail}:`,
              insightErr
            );
          }
        }
      } catch (notifErr) {
        console.error(
          `${LOG_PREFIX5} Failed to notify for transition ${transition.senderEmail} → ${transition.to}:`,
          notifErr
        );
      }
    }
    let trendAlerts = 0;
    try {
      const activeSenders = await prisma2.sender.findMany({
        where: {
          emailAddress: { not: null },
          status: { not: "disabled" }
        },
        select: {
          emailAddress: true,
          workspaceSlug: true,
          workspace: { select: { name: true } }
        }
      });
      for (const sender of activeSenders) {
        const email = sender.emailAddress;
        const domain = email.split("@")[1] ?? "";
        try {
          const trendResult = await detectBounceRateTrend(email);
          if (shouldAlertOnTrend(trendResult)) {
            await notifyBounceRateTrend({
              senderEmail: email,
              senderDomain: domain,
              workspaceName: sender.workspace.name,
              currentRate: trendResult.currentRate,
              previousRate: trendResult.previousRate,
              changePercent: trendResult.changePercent,
              skipEmail: true
            });
            trendAlerts++;
          }
        } catch (trendErr) {
          console.error(`${LOG_PREFIX5} Trend detection failed for ${email}:`, trendErr);
        }
      }
      if (trendAlerts > 0) {
        console.log(`${LOG_PREFIX5} Sent ${trendAlerts} bounce rate trend alert(s)`);
      }
    } catch (trendQueryErr) {
      console.error(`${LOG_PREFIX5} Failed to run trend detection:`, trendQueryErr);
    }
    let replyTrendAlerts = 0;
    try {
      const replyTrendResult = await runReplyTrendMonitor();
      for (const declining of replyTrendResult.declining) {
        try {
          await notifyReplyTrendDecline(declining);
          replyTrendAlerts++;
        } catch (notifErr) {
          console.error(
            `${LOG_PREFIX5} Failed to send reply trend alert for ${declining.workspaceSlug}:`,
            notifErr
          );
        }
      }
      if (replyTrendAlerts > 0) {
        console.log(`${LOG_PREFIX5} Sent ${replyTrendAlerts} reply trend decline alert(s)`);
      }
      console.log(
        `${LOG_PREFIX5} Reply trends: ${replyTrendResult.checked} checked, ${replyTrendResult.declining.length} declining, ${replyTrendResult.improving.length} improving, ${replyTrendResult.stable} stable`
      );
    } catch (replyTrendErr) {
      console.error(`${LOG_PREFIX5} Failed to run reply trend monitor:`, replyTrendErr);
    }
    if (digestItems.length > 0) {
      try {
        await sendSenderHealthDigestEmail(digestItems);
        console.log(
          `${LOG_PREFIX5} Sent sender health digest email covering ${digestItems.length} transition(s)`
        );
      } catch (digestErr) {
        console.error(`${LOG_PREFIX5} Failed to send sender health digest email:`, digestErr);
      }
    }
    console.log(
      `${LOG_PREFIX5} Evaluated ${result.evaluated}, transitioned ${result.transitioned}, skipped ${result.skipped}, bounceTrendAlerts ${trendAlerts}, replyTrendAlerts ${replyTrendAlerts}`
    );
    return {
      evaluated: result.evaluated,
      transitioned: result.transitioned,
      skipped: result.skipped,
      trendAlerts,
      replyTrendAlerts
    };
  }, "run")
});
export {
  bounceMonitorTask
};
//# sourceMappingURL=bounce-monitor.mjs.map
