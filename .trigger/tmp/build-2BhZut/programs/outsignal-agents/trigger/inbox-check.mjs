import {
  EmailBisonClient
} from "../../../chunk-HYVNS55X.mjs";
import {
  notifyInboxDisconnect
} from "../../../chunk-3ZZKUR37.mjs";
import {
  notify
} from "../../../chunk-UYQWQERQ.mjs";
import "../../../chunk-OCSVRKXM.mjs";
import "../../../chunk-7W7UG4Z3.mjs";
import "../../../chunk-GS4UDRHQ.mjs";
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

// trigger/inbox-check.ts
init_esm();

// src/lib/inbox-health/monitor.ts
init_esm();
async function checkAllWorkspaces() {
  const workspaces = await prisma.workspace.findMany({
    where: { apiToken: { not: null } },
    select: { slug: true, name: true, apiToken: true }
  });
  const results = [];
  for (const ws of workspaces) {
    if (!ws.apiToken) continue;
    try {
      const result = await checkWorkspace(ws.slug, ws.name, ws.apiToken);
      if (result) results.push(result);
    } catch (err) {
      console.error(`[inbox-health] Failed to check workspace ${ws.slug}:`, err);
    }
  }
  return results;
}
__name(checkAllWorkspaces, "checkAllWorkspaces");
async function checkWorkspace(slug, name, apiToken) {
  const client = new EmailBisonClient(apiToken);
  const senderEmails = await client.getSenderEmails();
  const currentStatuses = {};
  for (const sender of senderEmails) {
    currentStatuses[sender.email] = sender.status ?? "Unknown";
  }
  const previous = await prisma.inboxStatusSnapshot.findUnique({
    where: { workspaceSlug: slug }
  });
  const prevStatuses = previous ? JSON.parse(previous.statuses) : {};
  const prevDisconnected = previous ? JSON.parse(previous.disconnectedEmails) : [];
  const newDisconnections = [];
  const persistentDisconnections = [];
  const reconnections = [];
  const currentDisconnected = [];
  for (const [email, status] of Object.entries(currentStatuses)) {
    if (status !== "Connected") {
      currentDisconnected.push(email);
      if (previous) {
        const prevStatus = prevStatuses[email];
        if (prevStatus === "Connected" || prevStatus === void 0) {
          newDisconnections.push(email);
        } else if (prevDisconnected.includes(email)) {
          persistentDisconnections.push(email);
        }
      }
    } else {
      if (prevDisconnected.includes(email)) {
        reconnections.push(email);
      }
    }
  }
  await prisma.inboxStatusSnapshot.upsert({
    where: { workspaceSlug: slug },
    create: {
      workspaceSlug: slug,
      statuses: JSON.stringify(currentStatuses),
      disconnectedEmails: JSON.stringify(currentDisconnected)
    },
    update: {
      statuses: JSON.stringify(currentStatuses),
      disconnectedEmails: JSON.stringify(currentDisconnected),
      checkedAt: /* @__PURE__ */ new Date()
    }
  });
  if (newDisconnections.length === 0 && persistentDisconnections.length === 0 && reconnections.length === 0) {
    return null;
  }
  const totalConnected = senderEmails.filter(
    (s) => (s.status ?? "Unknown") === "Connected"
  ).length;
  return {
    workspaceSlug: slug,
    workspaceName: name,
    newDisconnections,
    persistentDisconnections,
    reconnections,
    totalDisconnected: currentDisconnected.length,
    totalConnected
  };
}
__name(checkWorkspace, "checkWorkspace");

// trigger/inbox-check.ts
var inboxCheckTask = schedules_exports.task({
  id: "inbox-check",
  cron: "0 6 * * *",
  // daily at 6am UTC
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5e3,
    maxTimeoutInMs: 6e4
  },
  run: /* @__PURE__ */ __name(async () => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    console.log(`[${timestamp}] [inbox-check] Starting inbox connectivity check`);
    const changes = await checkAllWorkspaces();
    for (const change of changes) {
      const hasNewDisconnections = change.newDisconnections.length > 0;
      const hasPersistentDisconnections = change.persistentDisconnections.length > 0;
      if (hasNewDisconnections || hasPersistentDisconnections) {
        await notifyInboxDisconnect(change);
        const parts = [];
        if (hasNewDisconnections) {
          parts.push(
            `${change.newDisconnections.length} newly disconnected: ${change.newDisconnections.slice(0, 5).join(", ")}${change.newDisconnections.length > 5 ? ` (+${change.newDisconnections.length - 5} more)` : ""}`
          );
        }
        if (hasPersistentDisconnections) {
          parts.push(
            `${change.persistentDisconnections.length} still disconnected: ${change.persistentDisconnections.slice(0, 5).join(", ")}${change.persistentDisconnections.length > 5 ? ` (+${change.persistentDisconnections.length - 5} more)` : ""}`
          );
        }
        await notify({
          type: "system",
          severity: hasNewDisconnections ? "error" : "warning",
          title: hasNewDisconnections ? `${change.newDisconnections.length} inbox${change.newDisconnections.length !== 1 ? "es" : ""} disconnected` : `${change.persistentDisconnections.length} inbox${change.persistentDisconnections.length !== 1 ? "es" : ""} still disconnected`,
          message: `${change.workspaceName}: ${parts.join(" | ")}`,
          workspaceSlug: change.workspaceSlug,
          metadata: {
            newDisconnections: change.newDisconnections,
            persistentDisconnections: change.persistentDisconnections,
            reconnections: change.reconnections,
            totalDisconnected: change.totalDisconnected,
            totalConnected: change.totalConnected
          }
        });
      }
      if (change.reconnections.length > 0 && !hasNewDisconnections && !hasPersistentDisconnections) {
        await notify({
          type: "system",
          severity: "info",
          title: `${change.reconnections.length} inbox${change.reconnections.length !== 1 ? "es" : ""} reconnected`,
          message: `${change.workspaceName}: ${change.reconnections.slice(0, 5).join(", ")}`,
          workspaceSlug: change.workspaceSlug
        });
      }
    }
    console.log(
      `[${timestamp}] [inbox-check] Complete: ${changes.length} workspace(s) with changes`
    );
    return {
      checked: changes.length,
      workspacesWithChanges: changes.map((c) => ({
        workspace: c.workspaceSlug,
        newDisconnections: c.newDisconnections.length,
        persistentDisconnections: c.persistentDisconnections.length,
        reconnections: c.reconnections.length
      }))
    };
  }, "run")
});
export {
  inboxCheckTask
};
//# sourceMappingURL=inbox-check.mjs.map
