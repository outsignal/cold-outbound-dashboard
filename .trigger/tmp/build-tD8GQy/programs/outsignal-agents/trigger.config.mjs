import {
  defineConfig
} from "../../chunk-ZD6M6VDX.mjs";
import "../../chunk-4GNBCTMK.mjs";
import {
  init_esm
} from "../../chunk-QA7U3GQ6.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  project: process.env.TRIGGER_PROJECT_REF,
  maxDuration: 300,
  dirs: ["./trigger"],
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
