import {
  expireStaleActions,
  progressWarmup,
  recoverStuckActions,
  updateAcceptanceRate
} from "../../../chunk-5NGDKPHQ.mjs";
import "../../../chunk-6UNNRELO.mjs";
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

// trigger/inbox-linkedin-maintenance.ts
init_esm();
var import_client = __toESM(require_default());
var prisma = new import_client.PrismaClient();
var inboxLinkedinMaintenanceTask = schedules_exports.task({
  id: "inbox-linkedin-maintenance",
  cron: "0 */6 * * *",
  // every 6 hours — more frequent than daily
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5e3,
    maxTimeoutInMs: 6e4
  },
  run: /* @__PURE__ */ __name(async () => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    console.log(`[${timestamp}] [inbox-linkedin-maintenance] Starting LinkedIn maintenance`);
    const activeSenders = await prisma.sender.findMany({
      where: { status: "active" },
      select: { id: true, name: true }
    });
    let warmupProcessed = 0;
    let warmupErrors = 0;
    for (const sender of activeSenders) {
      try {
        await progressWarmup(sender.id);
        warmupProcessed++;
      } catch (err) {
        warmupErrors++;
        console.error(`[inbox-linkedin-maintenance] progressWarmup failed for ${sender.name}:`, err);
      }
      try {
        await updateAcceptanceRate(sender.id);
      } catch (err) {
        console.error(`[inbox-linkedin-maintenance] updateAcceptanceRate failed for ${sender.name}:`, err);
      }
    }
    const stuckRecovered = await recoverStuckActions();
    const staleExpired = await expireStaleActions();
    console.log(
      `[${timestamp}] [inbox-linkedin-maintenance] Complete: warmup=${warmupProcessed}/${activeSenders.length}, errors=${warmupErrors}, stuck=${stuckRecovered}, expired=${staleExpired}`
    );
    return {
      warmupProcessed,
      warmupErrors,
      stuckRecovered,
      staleExpired,
      totalSenders: activeSenders.length
    };
  }, "run")
});
export {
  inboxLinkedinMaintenanceTask
};
//# sourceMappingURL=inbox-linkedin-maintenance.mjs.map
