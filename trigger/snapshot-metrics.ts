import { schedules } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { snapshotWorkspaceCampaigns } from "@/lib/analytics/snapshot";
import { backfillCopyStrategies } from "@/lib/analytics/strategy-detect";
import { classifyWorkspaceBodyElements } from "@/lib/analytics/body-elements";
import { anthropicQueue } from "./queues";

// PrismaClient at module scope — not inside run()
const prisma = new PrismaClient();

async function processWorkspace(slug: string) {
  const errors: string[] = [];

  const { campaignsProcessed, errors: snapshotErrors } =
    await snapshotWorkspaceCampaigns(slug);
  errors.push(...snapshotErrors);

  let strategiesBackfilled = 0;
  try {
    strategiesBackfilled = await backfillCopyStrategies(slug);
  } catch (err) {
    errors.push(
      `Strategy backfill failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let elementsClassified = 0;
  let elementsSkipped = 0;
  try {
    const result = await classifyWorkspaceBodyElements(slug);
    elementsClassified = result.classified;
    elementsSkipped = result.skipped;
    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
  } catch (err) {
    errors.push(
      `Body element classification failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return {
    workspace: slug,
    campaignsProcessed,
    strategiesBackfilled,
    elementsClassified,
    elementsSkipped,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export const snapshotMetrics = schedules.task({
  id: "snapshot-metrics",
  cron: "0 0 * * *", // daily at midnight UTC
  queue: anthropicQueue,
  maxDuration: 300, // 5 min — all workspaces with AI classification
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 2_000,
    maxTimeoutInMs: 30_000,
  },

  run: async () => {
    const workspaces = await prisma.workspace.findMany({
      select: { slug: true },
    });

    console.log(
      `[snapshot-metrics] Processing ${workspaces.length} workspaces`,
    );

    // Fan out across all workspaces in parallel — per-workspace error isolation
    const results = await Promise.all(
      workspaces.map(async (ws) => {
        try {
          return { ok: true, ...(await processWorkspace(ws.slug)) };
        } catch (err) {
          return {
            ok: false,
            workspace: ws.slug,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    console.log(
      `[snapshot-metrics] Done: ${succeeded} succeeded, ${failed} failed out of ${workspaces.length} workspaces`,
    );

    return { workspacesProcessed: results.length, results };
  },
});
