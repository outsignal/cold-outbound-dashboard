import { schedules } from "@trigger.dev/sdk";
import { checkAllWorkspaces } from "@/lib/inbox-health/monitor";
import { notifyInboxDisconnect } from "@/lib/notifications";
import { notify } from "@/lib/notify";

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

      if (change.reconnections.length > 0 && !hasNewDisconnections && !hasPersistentDisconnections) {
        await notify({
          type: "system",
          severity: "info",
          title: `${change.reconnections.length} inbox${change.reconnections.length !== 1 ? "es" : ""} reconnected`,
          message: `${change.workspaceName}: ${change.reconnections.slice(0, 5).join(", ")}`,
          workspaceSlug: change.workspaceSlug,
        });
      }
    }

    console.log(
      `[${timestamp}] [inbox-check] Complete: ${changes.length} workspace(s) with changes`,
    );

    return {
      checked: changes.length,
      workspacesWithChanges: changes.map((c) => ({
        workspace: c.workspaceSlug,
        newDisconnections: c.newDisconnections.length,
        persistentDisconnections: c.persistentDisconnections.length,
        reconnections: c.reconnections.length,
      })),
    };
  },
});
