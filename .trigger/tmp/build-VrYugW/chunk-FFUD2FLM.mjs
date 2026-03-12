import {
  queue
} from "./chunk-LNHUL6B5.mjs";
import {
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

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
//# sourceMappingURL=chunk-FFUD2FLM.mjs.map
