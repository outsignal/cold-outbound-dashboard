import { schedules } from "@trigger.dev/sdk";
import { checkAllWorkspaces } from "@/lib/inbox-health/monitor";
import { notifyInboxDisconnect } from "@/lib/notifications";
import { notify } from "@/lib/notify";
import { runSenderHealthCheck } from "@/lib/linkedin/health-check";
import { notifySenderHealth, sendSenderHealthDigest } from "@/lib/notifications";
import { refreshStaleSessions } from "@/lib/linkedin/session-refresh";
import { runSyncSenders } from "./sync-senders";

export const inboxCheckTask = schedules.task({
  id: "inbox-check",
  cron: "0 6 * * *", // daily at 6am UTC
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },

  run: async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [inbox-check] Starting inbox connectivity check`);

    const changes = await checkAllWorkspaces();

    for (const change of changes) {
      const hasNewDisconnections = change.newDisconnections.length > 0;
      const hasPersistentDisconnections = change.persistentDisconnections.length > 0;

      if (hasNewDisconnections || hasPersistentDisconnections) {
        // Email notification (no client Slack — ops Slack handled by notify() below)
        await notifyInboxDisconnect(change);

        // In-app notification + ops Slack
        const parts: string[] = [];
        if (hasNewDisconnections) {
          parts.push(
            `${change.newDisconnections.length} newly disconnected: ${change.newDisconnections.slice(0, 5).join(", ")}${change.newDisconnections.length > 5 ? ` (+${change.newDisconnections.length - 5} more)` : ""}`,
          );
        }
        if (hasPersistentDisconnections) {
          parts.push(
            `${change.persistentDisconnections.length} still disconnected: ${change.persistentDisconnections.slice(0, 5).join(", ")}${change.persistentDisconnections.length > 5 ? ` (+${change.persistentDisconnections.length - 5} more)` : ""}`,
          );
        }

        await notify({
          type: "system",
          severity: hasNewDisconnections ? "error" : "warning",
          title: hasNewDisconnections
            ? `${change.newDisconnections.length} inbox${change.newDisconnections.length !== 1 ? "es" : ""} disconnected`
            : `${change.persistentDisconnections.length} inbox${change.persistentDisconnections.length !== 1 ? "es" : ""} still disconnected`,
          message: `${change.workspaceName}: ${parts.join(" | ")}`,
          workspaceSlug: change.workspaceSlug,
          metadata: {
            newDisconnections: change.newDisconnections,
            persistentDisconnections: change.persistentDisconnections,
            reconnections: change.reconnections,
            totalDisconnected: change.totalDisconnected,
            totalConnected: change.totalConnected,
          },
        });
      }

      if (change.reconnections.length > 0) {
        await notify({
          type: "system",
          severity: "info",
          title: `${change.reconnections.length} inbox${change.reconnections.length !== 1 ? "es" : ""} reconnected`,
          message: `${change.workspaceName}: ${change.reconnections.slice(0, 5).join(", ")}`,
          workspaceSlug: change.workspaceSlug,
          metadata: {
            reconnections: change.reconnections,
          },
        });
      }
    }

    console.log(
      `[${timestamp}] [inbox-check] Step 1 complete: ${changes.length} workspace(s) with changes`,
    );

    // -----------------------------------------------------------------------
    // Step 2: Sender health check (merged from inbox-sender-health)
    // -----------------------------------------------------------------------
    console.log(`[${timestamp}] [inbox-check] Step 2: Sender health check`);

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
          console.error(`[inbox-check] Critical notification failed for ${result.senderName}:`, err);
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
        console.error("[inbox-check] Digest notification failed:", err);
      }
    }

    const criticalCount = healthResults.filter((r) => r.severity === "critical").length;
    const warningCount = warningsForDigest.length;

    // Session refresh logically belongs with sender health
    const sessionRefreshResult = await refreshStaleSessions();
    if (sessionRefreshResult.count > 0) {
      console.log(`[${timestamp}] [inbox-check] Session refresh: flagged ${sessionRefreshResult.count} stale sessions`);
    }

    console.log(
      `[${timestamp}] [inbox-check] Step 2 complete: ${healthResults.length} result(s) (${criticalCount} critical, ${warningCount} warnings)`,
    );

    // -----------------------------------------------------------------------
    // Step 3: Sync senders (merged from sync-senders scheduled task)
    // -----------------------------------------------------------------------
    console.log("[inbox-check] Running sync-senders...");
    const syncResult = await runSyncSenders();

    return {
      checked: changes.length,
      workspacesWithChanges: changes.map((c) => ({
        workspace: c.workspaceSlug,
        newDisconnections: c.newDisconnections.length,
        persistentDisconnections: c.persistentDisconnections.length,
        reconnections: c.reconnections.length,
      })),
      senderHealth: {
        healthChecked: healthResults.length,
        critical: criticalCount,
        warnings: warningCount,
        sessionRefreshCount: sessionRefreshResult.count,
      },
      senderSync: {
        workspaces: syncResult.workspaces,
        synced: syncResult.synced,
        created: syncResult.created,
        skipped: syncResult.skipped,
        errors: syncResult.errors.length,
      },
    };
  },
});
