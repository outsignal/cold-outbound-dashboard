import {
  captureAllWorkspaces
} from "../../../chunk-VCAHU2YN.mjs";
import "../../../chunk-HYVNS55X.mjs";
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

// trigger/bounce-snapshots.ts
init_esm();
var bounceSnapshotsTask = schedules_exports.task({
  id: "bounce-snapshots",
  cron: "0 8 * * *",
  // daily 8am UTC
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 2e3,
    maxTimeoutInMs: 3e4
  },
  run: /* @__PURE__ */ __name(async () => {
    console.log("[bounce-snapshots] Starting daily bounce snapshot capture");
    const result = await captureAllWorkspaces();
    console.log(
      `[bounce-snapshots] Complete: ${result.workspaces} workspaces, ${result.senders} senders captured, ${result.errors.length} errors`
    );
    if (result.errors.length > 0) {
      console.warn("[bounce-snapshots] Errors during capture:", result.errors);
    }
    return result;
  }, "run")
});
export {
  bounceSnapshotsTask
};
//# sourceMappingURL=bounce-snapshots.mjs.map
