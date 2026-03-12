import {
  queue
} from "../../../chunk-6K3LIJO2.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/queues.ts
init_esm();
var anthropicQueue = queue({
  name: "anthropic-queue",
  concurrencyLimit: 3
});
var emailBisonQueue = queue({
  name: "emailbison-queue",
  concurrencyLimit: 3
});
export {
  anthropicQueue,
  emailBisonQueue
};
//# sourceMappingURL=queues.mjs.map
