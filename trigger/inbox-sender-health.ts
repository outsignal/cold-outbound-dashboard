import { schedules } from "@trigger.dev/sdk";
import { runSenderHealthCheck } from "@/lib/linkedin/health-check";
import { notifySenderHealth, sendSenderHealthDigest } from "@/lib/notifications";
import { notify } from "@/lib/notify";
import { refreshStaleSessions } from "@/lib/linkedin/session-refresh";

export const inboxSenderHealthTask = schedules.task({
  id: "inbox-sender-health",
  cron: "0 6 * * *", // daily at 6am UTC — parallel with inbox-check
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },

  run: async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [inbox-sender-health] Starting sender health check`);

    const healthResults = await runSenderHealthCheck();

    const warningsForDigest: Array<{
      workspaceSlug: string;
      senderName: string;
      reason: string;
      detail: string;
    }> = [];

    for (const result of healthResults) {
      if (result.severity === "critical") {
        // Critical: fire immediate Slack + email notification
        try {
          await notifySenderHealth({
            workspaceSlug: result.workspaceSlug,
            senderName: result.senderName,
            reason: result.reason,
            detail: result.detail,
            severity: "critical",
            reassignedCount: result.reassignedCount,
            workspacePaused: result.workspacePaused,
          });
        } catch (err) {
          console.error(`[inbox-sender-health] Critical notification failed for ${result.senderName}:`, err);
        }

        // Also write to in-app notification + ops Slack
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
            workspacePaused: result.workspacePaused,
          },
        });
      } else {
        // Warning: collect for daily digest
        warningsForDigest.push({
          workspaceSlug: result.workspaceSlug,
          senderName: result.senderName,
          reason: result.reason,
          detail: result.detail,
        });
      }
    }

    // Send daily digest for warning-level events (Slack only)
    if (warningsForDigest.length > 0) {
      try {
        await sendSenderHealthDigest({ warnings: warningsForDigest });
      } catch (err) {
        console.error("[inbox-sender-health] Digest notification failed:", err);
      }
    }

    const criticalCount = healthResults.filter((r) => r.severity === "critical").length;
    const warningCount = warningsForDigest.length;

    // Session refresh logically belongs with sender health
    const sessionRefreshResult = await refreshStaleSessions();
    if (sessionRefreshResult.count > 0) {
      console.log(`[${timestamp}] [inbox-sender-health] Session refresh: flagged ${sessionRefreshResult.count} stale sessions`);
    }

    console.log(
      `[${timestamp}] [inbox-sender-health] Complete: ${healthResults.length} result(s) (${criticalCount} critical, ${warningCount} warnings)`,
    );

    return {
      healthChecked: healthResults.length,
      critical: criticalCount,
      warnings: warningCount,
      sessionRefreshCount: sessionRefreshResult.count,
    };
  },
});
