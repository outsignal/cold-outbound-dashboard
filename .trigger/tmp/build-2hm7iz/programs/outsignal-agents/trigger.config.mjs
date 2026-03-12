import {
  defineConfig
} from "../../chunk-ZD6M6VDX.mjs";
import "../../chunk-4GNBCTMK.mjs";
import {
  __name,
  init_esm
} from "../../chunk-QA7U3GQ6.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  project: process.env.TRIGGER_PROJECT_REF,
  maxDuration: 300,
  dirs: ["./trigger"],
  build: {},
  onFailure: /* @__PURE__ */ __name(async ({ error, ctx }) => {
    const opsChannelId = process.env.OPS_SLACK_CHANNEL_ID;
    const slackToken = process.env.SLACK_BOT_TOKEN;
    if (!opsChannelId || !slackToken) return;
    const workspaceTag = ctx.run.tags?.find((t) => !t.startsWith("run_")) ?? "N/A";
    const errorMessage = error instanceof Error ? error.message : String(error);
    const runUrl = `https://cloud.trigger.dev/runs/${ctx.run.id}`;
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${slackToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: opsChannelId,
        text: `Task failed: ${ctx.task.id}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Task failed:* \`${ctx.task.id}\`
*Workspace:* ${workspaceTag}
*Error:* ${errorMessage}
*Run:* <${runUrl}|View in Trigger.dev>`
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Run ID: \`${ctx.run.id}\` | Attempt: ${ctx.attempt.number} | ${(/* @__PURE__ */ new Date()).toISOString()}`
              }
            ]
          }
        ]
      })
    }).catch((err) => console.error("[onFailure] Slack alert failed:", err));
  }, "onFailure")
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
