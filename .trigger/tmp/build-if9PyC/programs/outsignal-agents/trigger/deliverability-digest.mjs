import {
  notifyDeliverabilityDigest
} from "../../../chunk-3HLWUZCU.mjs";
import "../../../chunk-CUL2PCFS.mjs";
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

// trigger/deliverability-digest.ts
init_esm();
var deliverabilityDigestTask = schedules_exports.task({
  id: "deliverability-digest",
  cron: "0 8 * * 1",
  // weekly Monday 8am UTC
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 2e3,
    maxTimeoutInMs: 3e4
  },
  run: /* @__PURE__ */ __name(async () => {
    console.log("[deliverability-digest] Starting weekly deliverability digest");
    await notifyDeliverabilityDigest();
    console.log("[deliverability-digest] Digest complete");
    return { ok: true };
  }, "run")
});
export {
  deliverabilityDigestTask
};
//# sourceMappingURL=deliverability-digest.mjs.map
