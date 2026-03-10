import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron-auth";
import { snapshotWorkspaceCampaigns } from "@/lib/analytics/snapshot";
import { backfillCopyStrategies } from "@/lib/analytics/strategy-detect";
import { classifyWorkspaceBodyElements } from "@/lib/analytics/body-elements";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

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

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = new URL(request.url).searchParams.get("workspace");

  // Single workspace mode (existing behavior)
  if (workspace) {
    try {
      const result = await processWorkspace(workspace);
      return NextResponse.json({
        ok: true,
        ...result,
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

  // All workspaces mode
  try {
    const workspaces = await prisma.workspace.findMany({
      select: { slug: true },
    });

    const results = [];
    for (const ws of workspaces) {
      try {
        results.push({ ok: true, ...(await processWorkspace(ws.slug)) });
      } catch (err) {
        results.push({
          ok: false,
          workspace: ws.slug,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      workspacesProcessed: results.length,
      results,
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
