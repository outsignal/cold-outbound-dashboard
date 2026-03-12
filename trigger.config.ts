import { defineConfig } from "@trigger.dev/sdk";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF!,
  maxDuration: 300,
  dirs: ["./trigger"],
  build: {
    extensions: [
      prismaExtension({
        mode: "legacy",
        schema: "prisma/schema.prisma",
        // NOTE: migrate omitted — project uses prisma db push, not migrations (Phase 35-01 decision)
        // NOTE: syncVercelEnvVars omitted — using Vercel dashboard integration instead (v6.0 locked decision)
      }),
    ],
  },
  onFailure: async ({ error, ctx }: { error: unknown; ctx: { task: { id: string }; run: { id: string; tags?: string[] }; attempt: { number: number } } }) => {
    const opsChannelId = process.env.OPS_SLACK_CHANNEL_ID;
    const slackToken = process.env.SLACK_BOT_TOKEN;
    if (!opsChannelId || !slackToken) return;

    const workspaceTag = ctx.run.tags?.find((t: string) => !t.startsWith("run_")) ?? "N/A";
    const errorMessage = error instanceof Error ? error.message : String(error);
    const runUrl = `https://cloud.trigger.dev/runs/${ctx.run.id}`;

    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${slackToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: opsChannelId,
        text: `Task failed: ${ctx.task.id}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Task failed:* \`${ctx.task.id}\`\n*Workspace:* ${workspaceTag}\n*Error:* ${errorMessage}\n*Run:* <${runUrl}|View in Trigger.dev>`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Run ID: \`${ctx.run.id}\` | Attempt: ${ctx.attempt.number} | ${new Date().toISOString()}`,
              },
            ],
          },
        ],
      }),
    }).catch((err) => console.error("[onFailure] Slack alert failed:", err));
  },
});
