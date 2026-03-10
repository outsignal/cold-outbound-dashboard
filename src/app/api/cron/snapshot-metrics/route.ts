import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron-auth";
import { snapshotWorkspaceCampaigns } from "@/lib/analytics/snapshot";
import { backfillCopyStrategies } from "@/lib/analytics/strategy-detect";
import { classifyWorkspaceBodyElements } from "@/lib/analytics/body-elements";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = new URL(request.url).searchParams.get("workspace");
  if (!workspace) {
    return NextResponse.json(
      { error: "workspace query parameter required" },
      { status: 400 },
    );
  }

  try {
    const { campaignsProcessed, errors } =
      await snapshotWorkspaceCampaigns(workspace);

    let strategiesBackfilled = 0;
    try {
      strategiesBackfilled = await backfillCopyStrategies(workspace);
    } catch (err) {
      errors.push(
        `Strategy backfill failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    let elementsClassified = 0;
    let elementsSkipped = 0;
    try {
      const result = await classifyWorkspaceBodyElements(workspace);
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

    return NextResponse.json({
      ok: true,
      workspace,
      campaignsProcessed,
      strategiesBackfilled,
      elementsClassified,
      elementsSkipped,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[snapshot-metrics] Unhandled error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
