import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron-auth";
import { captureAllWorkspaces } from "@/lib/domain-health/snapshots";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    console.log(
      `[${new Date().toISOString()}] Unauthorized: GET /api/cron/bounce-snapshots`,
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timestamp = new Date().toISOString();
  console.log(`[bounce-snapshots] Starting daily bounce snapshot capture at ${timestamp}`);

  try {
    const result = await captureAllWorkspaces();

    console.log(
      `[bounce-snapshots] Complete: ${result.workspaces} workspaces, ${result.senders} senders captured, ${result.errors.length} errors`,
    );

    if (result.errors.length > 0) {
      console.warn("[bounce-snapshots] Errors during capture:", result.errors);
    }

    return NextResponse.json({
      status: "ok",
      workspaces: result.workspaces,
      senders: result.senders,
      errors: result.errors,
      timestamp,
    });
  } catch (error) {
    console.error("[bounce-snapshots] Fatal error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Snapshot capture failed",
        timestamp,
      },
      { status: 500 },
    );
  }
}
