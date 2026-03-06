import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminAuth } from "@/lib/require-admin-auth";

/**
 * GET /api/senders/[id]/health-history
 * Returns sender health events for sparkline and event history.
 *
 * Response:
 * - events: last 10 events (most recent first)
 * - sparkline: 30 data points (one per day, worst status per day, 0=healthy, 1=warning, 2=blocked/session_expired)
 * - summary: { currentStatus, lastFlagReason, flagCount, daysSinceLastIncident }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const sender = await prisma.sender.findUnique({
      where: { id },
      select: { id: true, healthStatus: true },
    });

    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Fetch last 100 events in the 30-day window, descending
    const events = await prisma.senderHealthEvent.findMany({
      where: {
        senderId: id,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Severity mapping: higher number = worse
    function statusToNum(status: string): number {
      if (status === "blocked" || status === "session_expired") return 2;
      if (status === "warning") return 1;
      return 0; // healthy / paused treated as 0 for sparkline purposes
    }

    // Build 30-day sparkline: aggregate by day, pick worst status per day
    const dayMap = new Map<string, number>(); // "YYYY-MM-DD" -> worst statusNum

    for (const event of events) {
      const dayKey = event.createdAt.toISOString().slice(0, 10);
      const severity = statusToNum(event.status);
      const current = dayMap.get(dayKey) ?? 0;
      if (severity > current) {
        dayMap.set(dayKey, severity);
      }
    }

    // Generate 30 date keys from today going back
    const sparkline: Array<{ date: string; statusNum: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      sparkline.push({ date: key, statusNum: dayMap.get(key) ?? 0 });
    }

    // Summary metrics
    const nonHealthyEvents = events.filter((e) => e.status !== "healthy");
    const flagCount = nonHealthyEvents.length;

    const lastFlagEvent = nonHealthyEvents[0] ?? null; // already sorted desc
    const lastFlagReason = lastFlagEvent?.reason ?? null;

    let daysSinceLastIncident: number | null = null;
    if (lastFlagEvent) {
      const msPerDay = 1000 * 60 * 60 * 24;
      daysSinceLastIncident = Math.floor(
        (Date.now() - lastFlagEvent.createdAt.getTime()) / msPerDay
      );
    }

    // Return only the last 10 events for the UI list
    const recentEvents = events.slice(0, 10).map((e) => ({
      id: e.id,
      status: e.status,
      reason: e.reason,
      detail: e.detail,
      bouncePct: e.bouncePct,
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({
      events: recentEvents,
      sparkline,
      summary: {
        currentStatus: sender.healthStatus,
        lastFlagReason,
        flagCount,
        daysSinceLastIncident,
      },
    });
  } catch (error) {
    console.error("Health history error:", error);
    return NextResponse.json({ error: "Failed to get health history" }, { status: 500 });
  }
}
