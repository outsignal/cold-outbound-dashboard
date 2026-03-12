import {
  notifySenderHealth,
  sendSenderHealthDigest
} from "../../../chunk-3HLWUZCU.mjs";
import {
  notify
} from "../../../chunk-CUL2PCFS.mjs";
import "../../../chunk-OCSVRKXM.mjs";
import "../../../chunk-ADKV6LO6.mjs";
import "../../../chunk-I7EJTL45.mjs";
import "../../../chunk-I775ELQ2.mjs";
import {
  prisma
} from "../../../chunk-6UNNRELO.mjs";
import "../../../chunk-6DNKPBNV.mjs";
import {
  schedules_exports
} from "../../../chunk-ZD6M6VDX.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  __name,
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/inbox-sender-health.ts
init_esm();

// src/lib/linkedin/health-check.ts
init_esm();
async function runSenderHealthCheck() {
  const results = [];
  const now = /* @__PURE__ */ new Date();
  const senders = await prisma.sender.findMany({
    where: { status: { in: ["active", "setup"] } },
    include: { workspace: true }
  });
  if (senders.length === 0) return results;
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
  const webhookEvents = await prisma.webhookEvent.findMany({
    where: {
      eventType: { in: ["EMAIL_SENT", "BOUNCED"] },
      receivedAt: { gte: since24h },
      senderEmail: { not: null }
    },
    select: { senderEmail: true, eventType: true }
  });
  const bounceMap = /* @__PURE__ */ new Map();
  for (const event of webhookEvents) {
    if (!event.senderEmail) continue;
    const key = event.senderEmail.toLowerCase();
    const entry = bounceMap.get(key) ?? { sent: 0, bounced: 0 };
    if (event.eventType === "EMAIL_SENT") entry.sent++;
    else if (event.eventType === "BOUNCED") entry.bounced++;
    bounceMap.set(key, entry);
  }
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  const senderIds = senders.map((s) => s.id);
  const yesterdayUsage = await prisma.linkedInDailyUsage.findMany({
    where: {
      senderId: { in: senderIds },
      date: yesterday
    },
    select: { senderId: true, captchaDetected: true, restrictionNotice: true }
  });
  const usageMap = /* @__PURE__ */ new Map();
  for (const u of yesterdayUsage) {
    usageMap.set(u.senderId, {
      captchaDetected: u.captchaDetected,
      restrictionNotice: u.restrictionNotice
    });
  }
  const COOLDOWN_MS = 48 * 60 * 60 * 1e3;
  for (const sender of senders) {
    if (sender.healthStatus === "warning" && sender.healthFlaggedAt) {
      const elapsed = now.getTime() - sender.healthFlaggedAt.getTime();
      if (elapsed >= COOLDOWN_MS) {
        const emailKey = sender.emailAddress?.toLowerCase();
        const bounceData = emailKey ? bounceMap.get(emailKey) : void 0;
        const currentBouncePct = bounceData && bounceData.sent >= 10 ? bounceData.bounced / bounceData.sent : 0;
        if (currentBouncePct <= 0.05) {
          await prisma.sender.update({
            where: { id: sender.id },
            data: {
              healthStatus: "healthy",
              healthFlaggedAt: null
            }
          });
          await prisma.senderHealthEvent.create({
            data: {
              senderId: sender.id,
              status: "healthy",
              reason: "auto_recovered",
              detail: `Auto-recovered after 48h cooldown. Current bounce rate: ${(currentBouncePct * 100).toFixed(1)}%`,
              bouncePct: currentBouncePct > 0 ? currentBouncePct : null
            }
          });
          results.push({
            senderId: sender.id,
            senderName: sender.name,
            workspaceSlug: sender.workspaceSlug,
            previousStatus: "warning",
            newStatus: "healthy",
            reason: "auto_recovered",
            detail: `Auto-recovered after 48h cooldown. Current bounce rate: ${(currentBouncePct * 100).toFixed(1)}%`,
            bouncePct: currentBouncePct > 0 ? currentBouncePct : null,
            severity: "warning",
            reassignedCount: 0,
            workspacePaused: false
          });
        }
      }
    }
  }
  const freshSenders = await prisma.sender.findMany({
    where: { status: { in: ["active", "setup"] } }
  });
  for (const sender of freshSenders) {
    let newStatus = null;
    let reason = null;
    let detail = null;
    let bouncePct = null;
    let severity = "warning";
    const usage = usageMap.get(sender.id);
    if (usage?.captchaDetected && sender.healthStatus !== "blocked") {
      newStatus = "blocked";
      reason = "captcha";
      detail = "CAPTCHA detected in yesterday's LinkedIn session. Manual review required.";
      severity = "critical";
    } else if (usage?.restrictionNotice && sender.healthStatus !== "blocked") {
      newStatus = "blocked";
      reason = "restriction";
      detail = "LinkedIn restriction notice detected in yesterday's session. Manual review required.";
      severity = "critical";
    }
    if (!newStatus && sender.sessionStatus === "expired" && sender.healthStatus !== "session_expired") {
      newStatus = "session_expired";
      reason = "session_expired";
      detail = "LinkedIn session cookie has expired. Re-authentication required.";
      severity = "critical";
    }
    if (!newStatus && sender.emailAddress) {
      const emailKey = sender.emailAddress.toLowerCase();
      const bounceData = bounceMap.get(emailKey);
      if (bounceData && bounceData.sent >= 10) {
        const rate = bounceData.bounced / bounceData.sent;
        if (rate > 0.05 && sender.healthStatus !== "warning") {
          newStatus = "warning";
          reason = "bounce_rate";
          bouncePct = rate;
          detail = `Bounce rate ${(rate * 100).toFixed(1)}% (${bounceData.bounced}/${bounceData.sent} sends in last 24h). Sender flagged for monitoring.`;
          severity = "warning";
        }
      }
    }
    if (!newStatus || !reason || !detail) continue;
    const isSoftFlag = severity === "warning";
    await prisma.sender.update({
      where: { id: sender.id },
      data: {
        healthStatus: newStatus,
        healthFlaggedAt: isSoftFlag ? now : sender.healthFlaggedAt
        // only set for soft flags
      }
    });
    await prisma.senderHealthEvent.create({
      data: {
        senderId: sender.id,
        status: newStatus,
        reason,
        detail,
        bouncePct
      }
    });
    let reassignedCount = 0;
    let workspacePaused = false;
    if (severity === "critical") {
      const reassignResult = await reassignActions(sender.id, sender.workspaceSlug);
      reassignedCount = reassignResult.reassignedCount;
      const healthySendersInWorkspace = await prisma.sender.count({
        where: {
          workspaceSlug: sender.workspaceSlug,
          status: { in: ["active", "setup"] },
          healthStatus: { in: ["healthy", "warning"] },
          id: { not: sender.id }
          // exclude the one we just flagged
        }
      });
      if (healthySendersInWorkspace === 0) {
        await prisma.$transaction(async (tx) => {
          await tx.campaign.updateMany({
            where: {
              workspaceSlug: sender.workspaceSlug,
              status: { in: ["active", "deployed"] }
            },
            data: { status: "paused" }
          });
        });
        workspacePaused = true;
      }
    }
    results.push({
      senderId: sender.id,
      senderName: sender.name,
      workspaceSlug: sender.workspaceSlug,
      previousStatus: sender.healthStatus,
      newStatus,
      reason,
      detail,
      bouncePct,
      severity,
      reassignedCount,
      workspacePaused
    });
  }
  return results;
}
__name(runSenderHealthCheck, "runSenderHealthCheck");
async function reassignActions(flaggedSenderId, workspaceSlug) {
  const today = /* @__PURE__ */ new Date();
  today.setUTCHours(0, 0, 0, 0);
  const healthySenders = await prisma.sender.findMany({
    where: {
      workspaceSlug,
      status: { in: ["active", "setup"] },
      healthStatus: { in: ["healthy", "warning"] },
      id: { not: flaggedSenderId }
    }
  });
  if (healthySenders.length === 0) {
    return { reassignedCount: 0 };
  }
  const healthySenderIds = healthySenders.map((s) => s.id);
  const [pendingCounts, todayUsages] = await Promise.all([
    prisma.linkedInAction.groupBy({
      by: ["senderId"],
      where: { senderId: { in: healthySenderIds }, status: "pending" },
      _count: { _all: true }
    }),
    prisma.linkedInDailyUsage.findMany({
      where: { senderId: { in: healthySenderIds }, date: today },
      select: { senderId: true, connectionsSent: true, messagesSent: true }
    })
  ]);
  const pendingCountMap = new Map(pendingCounts.map((p) => [p.senderId, p._count._all]));
  const usageTodayMap = new Map(todayUsages.map((u) => [u.senderId, u]));
  const sendersWithLoad = healthySenders.map((s) => {
    const pendingCount = pendingCountMap.get(s.id) ?? 0;
    const todayUsage = usageTodayMap.get(s.id);
    const connectionsUsed = todayUsage?.connectionsSent ?? 0;
    const messagesUsed = todayUsage?.messagesSent ?? 0;
    const remainingBudget = s.dailyConnectionLimit - connectionsUsed + (s.dailyMessageLimit - messagesUsed);
    return { sender: s, pendingCount, remainingBudget };
  });
  sendersWithLoad.sort((a, b) => {
    const scoreA = a.pendingCount - a.remainingBudget;
    const scoreB = b.pendingCount - b.remainingBudget;
    return scoreA - scoreB;
  });
  const targetSender = sendersWithLoad[0]?.sender;
  if (!targetSender) return { reassignedCount: 0 };
  const result = await prisma.linkedInAction.updateMany({
    where: {
      senderId: flaggedSenderId,
      status: "pending"
    },
    data: {
      senderId: targetSender.id
    }
  });
  return { reassignedCount: result.count };
}
__name(reassignActions, "reassignActions");

// src/lib/linkedin/session-refresh.ts
init_esm();
async function refreshStaleSessions() {
  const SIX_DAYS_AGO = new Date(Date.now() - 6 * 24 * 60 * 60 * 1e3);
  const staleSenders = await prisma.sender.findMany({
    where: {
      status: "active",
      sessionStatus: "active",
      updatedAt: { lt: SIX_DAYS_AGO },
      // Only senders with session data (have been authenticated)
      sessionData: { not: null }
    },
    select: {
      id: true,
      name: true,
      workspaceSlug: true,
      updatedAt: true
    }
  });
  if (staleSenders.length === 0) {
    return { count: 0, senders: [] };
  }
  const flagged = [];
  for (const sender of staleSenders) {
    await prisma.sender.update({
      where: { id: sender.id },
      data: {
        sessionStatus: "expired",
        healthStatus: "session_expired"
      }
    });
    await prisma.senderHealthEvent.create({
      data: {
        senderId: sender.id,
        status: "session_expired",
        reason: "session_expired",
        detail: `Proactive session refresh: session last updated ${sender.updatedAt.toISOString()}, older than 6 days`
      }
    });
    flagged.push(`${sender.name} (${sender.workspaceSlug})`);
  }
  console.log(
    `[Session Refresh] Flagged ${flagged.length} stale sender sessions:`,
    flagged
  );
  return { count: flagged.length, senders: flagged };
}
__name(refreshStaleSessions, "refreshStaleSessions");

// trigger/inbox-sender-health.ts
var inboxSenderHealthTask = schedules_exports.task({
  id: "inbox-sender-health",
  cron: "0 6 * * *",
  // daily at 6am UTC — parallel with inbox-check
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5e3,
    maxTimeoutInMs: 6e4
  },
  run: /* @__PURE__ */ __name(async () => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    console.log(`[${timestamp}] [inbox-sender-health] Starting sender health check`);
    const healthResults = await runSenderHealthCheck();
    const warningsForDigest = [];
    for (const result of healthResults) {
      if (result.severity === "critical") {
        try {
          await notifySenderHealth({
            workspaceSlug: result.workspaceSlug,
            senderName: result.senderName,
            reason: result.reason,
            detail: result.detail,
            severity: "critical",
            reassignedCount: result.reassignedCount,
            workspacePaused: result.workspacePaused
          });
        } catch (err) {
          console.error(`[inbox-sender-health] Critical notification failed for ${result.senderName}:`, err);
        }
        await notify({
          type: "system",
          severity: "error",
          title: `Sender flagged: ${result.senderName}`,
          message: result.detail,
          workspaceSlug: result.workspaceSlug,
          metadata: {
            senderId: result.senderId,
            reason: result.reason,
            reassignedCount: result.reassignedCount,
            workspacePaused: result.workspacePaused
          }
        });
      } else {
        warningsForDigest.push({
          workspaceSlug: result.workspaceSlug,
          senderName: result.senderName,
          reason: result.reason,
          detail: result.detail
        });
      }
    }
    if (warningsForDigest.length > 0) {
      try {
        await sendSenderHealthDigest({ warnings: warningsForDigest });
      } catch (err) {
        console.error("[inbox-sender-health] Digest notification failed:", err);
      }
    }
    const criticalCount = healthResults.filter((r) => r.severity === "critical").length;
    const warningCount = warningsForDigest.length;
    const sessionRefreshResult = await refreshStaleSessions();
    if (sessionRefreshResult.count > 0) {
      console.log(`[${timestamp}] [inbox-sender-health] Session refresh: flagged ${sessionRefreshResult.count} stale sessions`);
    }
    console.log(
      `[${timestamp}] [inbox-sender-health] Complete: ${healthResults.length} result(s) (${criticalCount} critical, ${warningCount} warnings)`
    );
    return {
      healthChecked: healthResults.length,
      critical: criticalCount,
      warnings: warningCount,
      sessionRefreshCount: sessionRefreshResult.count
    };
  }, "run")
});
export {
  inboxSenderHealthTask
};
//# sourceMappingURL=inbox-sender-health.mjs.map
