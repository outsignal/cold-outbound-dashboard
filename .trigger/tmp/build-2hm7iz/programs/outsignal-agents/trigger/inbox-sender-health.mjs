import {
  refreshStaleSessions,
  runSenderHealthCheck
} from "../../../chunk-W265TGPE.mjs";
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
import "../../../chunk-6UNNRELO.mjs";
import "../../../chunk-6DNKPBNV.mjs";
import {
  schedules_exports
} from "../../../chunk-LNHUL6B5.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  __name,
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/inbox-sender-health.ts
init_esm();
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
