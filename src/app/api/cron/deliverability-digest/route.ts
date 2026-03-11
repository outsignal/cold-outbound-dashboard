/**
 * Weekly Deliverability Digest Cron Endpoint
 *
 * Fires once per week (Monday 8am UTC) — sends a cross-workspace deliverability
 * summary to the ops Slack channel and admin email.
 *
 * Register on cron-job.org:
 *   Schedule: 0 8 * * 1 (Monday 8am UTC)
 *   URL: https://admin.outsignal.ai/api/cron/deliverability-digest
 *   Header: Authorization: Bearer {CRON_SECRET}
 */

import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/cron-auth";
import { notifyDeliverabilityDigest } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const LOG_PREFIX = "[cron/deliverability-digest]";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    console.log(
      `[${new Date().toISOString()}] Unauthorized: GET /api/cron/deliverability-digest`,
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timestamp = new Date().toISOString();
  console.log(`${LOG_PREFIX} Starting weekly deliverability digest at ${timestamp}`);

  try {
    await notifyDeliverabilityDigest();
    console.log(`${LOG_PREFIX} Digest complete`);
    return NextResponse.json({ ok: true, timestamp });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${LOG_PREFIX} Fatal error:`, error);
    return NextResponse.json(
      { error: "Internal error", message, timestamp },
      { status: 500 },
    );
  }
}
