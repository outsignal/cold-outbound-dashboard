import { NextResponse } from "next/server";
import { refreshStaleSessions } from "@/lib/linkedin/session-refresh";

// CRON_SECRET guards this endpoint on Vercel
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends Authorization header)
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshStaleSessions();

    if (result.count === 0) {
      return NextResponse.json({ message: "No stale sessions found", count: 0 });
    }

    return NextResponse.json({
      message: `Flagged ${result.count} sender sessions for re-auth`,
      count: result.count,
      senders: result.senders,
    });
  } catch (error) {
    console.error("[Session Refresh] Error:", error);
    return NextResponse.json({ error: "Session refresh failed" }, { status: 500 });
  }
}
