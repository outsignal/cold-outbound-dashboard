/**
 * GET /api/signals
 * Returns aggregated signal monitoring data for the signal intelligence dashboard.
 *
 * Query params:
 * - workspace — optional filter (default: "all" = no filter; specific slug = filter by workspaceSlug)
 * - limit     — feed limit (default: 100, max: 500)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const workspaceParam = searchParams.get("workspace") ?? "all";
    const workspaceFilter = workspaceParam !== "all" ? workspaceParam : null;
    const limitParam = parseInt(searchParams.get("limit") ?? "100", 10);
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 100 : limitParam), 500);

    // Date arithmetic — all UTC
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    // Workspace filter clause for SignalEvent queries
    const signalEventWhere = workspaceFilter
      ? { workspaceSlug: workspaceFilter }
      : {};

    // Run all queries in parallel
    const [
      feed,
      typeDistributionRaw,
      costData,
      leadsGenerated,
      workspaces,
      signalsByWorkspaceRaw,
    ] = await Promise.all([
      // 1. Feed: recent signal events
      prisma.signalEvent.findMany({
        where: signalEventWhere,
        orderBy: { detectedAt: "desc" },
        take: limit,
        select: {
          id: true,
          signalType: true,
          companyName: true,
          companyDomain: true,
          workspaceSlug: true,
          title: true,
          isHighIntent: true,
          detectedAt: true,
          status: true,
        },
      }),

      // 2. Type distribution (7d)
      prisma.signalEvent.groupBy({
        by: ["signalType"],
        where: {
          ...signalEventWhere,
          detectedAt: { gte: sevenDaysAgo },
        },
        _count: { id: true },
      }),

      // 3. Cost data (7d)
      prisma.signalDailyCost.findMany({
        where: {
          date: { gte: sevenDaysAgoStr },
          ...(workspaceFilter ? { workspaceSlug: workspaceFilter } : {}),
        },
        orderBy: { date: "asc" },
      }),

      // 4. Leads generated per workspace (7d via campaign join)
      prisma.signalCampaignLead.findMany({
        where: {
          outcome: "added",
          addedAt: { gte: sevenDaysAgo },
          ...(workspaceFilter ? { campaign: { workspaceSlug: workspaceFilter } } : {}),
        },
        select: {
          campaign: { select: { workspaceSlug: true } },
        },
      }),

      // 5. Workspace caps and names
      prisma.workspace.findMany({
        where: workspaceFilter ? { slug: workspaceFilter } : undefined,
        select: {
          slug: true,
          name: true,
          signalDailyCapUsd: true,
        },
      }),

      // 6. Signals per workspace (7d groupBy)
      prisma.signalEvent.groupBy({
        by: ["workspaceSlug"],
        where: {
          ...signalEventWhere,
          detectedAt: { gte: sevenDaysAgo },
        },
        _count: { id: true },
      }),
    ]);

    // --- Aggregate leads by workspace ---
    const leadsByWorkspace: Record<string, number> = {};
    for (const l of leadsGenerated) {
      const ws = l.campaign.workspaceSlug;
      leadsByWorkspace[ws] = (leadsByWorkspace[ws] ?? 0) + 1;
    }

    // --- Aggregate costs ---
    let totalDailyUsd = 0;
    let totalWeeklyUsd = 0;
    const costByWorkspace: Record<string, { weekly: number; today: number }> = {};

    for (const cost of costData) {
      totalWeeklyUsd += cost.totalUsd;
      if (cost.date === todayStr) {
        totalDailyUsd += cost.totalUsd;
      }

      if (!costByWorkspace[cost.workspaceSlug]) {
        costByWorkspace[cost.workspaceSlug] = { weekly: 0, today: 0 };
      }
      costByWorkspace[cost.workspaceSlug].weekly += cost.totalUsd;
      if (cost.date === todayStr) {
        costByWorkspace[cost.workspaceSlug].today += cost.totalUsd;
      }
    }

    // --- Signals per workspace map ---
    const signalsPerWorkspace: Record<string, number> = {};
    for (const row of signalsByWorkspaceRaw) {
      signalsPerWorkspace[row.workspaceSlug] = row._count.id;
    }

    // --- Build perWorkspace array ---
    const perWorkspace = workspaces
      .map((ws) => ({
        slug: ws.slug,
        name: ws.name,
        signalsFired: signalsPerWorkspace[ws.slug] ?? 0,
        leadsGenerated: leadsByWorkspace[ws.slug] ?? 0,
        weeklyUsd: costByWorkspace[ws.slug]?.weekly ?? 0,
        todayUsd: costByWorkspace[ws.slug]?.today ?? 0,
        dailyCapUsd: ws.signalDailyCapUsd,
      }))
      .sort((a, b) => b.signalsFired - a.signalsFired);

    // --- Type distribution ---
    const typeDistribution = typeDistributionRaw.map((row) => ({
      name: row.signalType,
      count: row._count.id,
    }));

    return NextResponse.json({
      feed,
      typeDistribution,
      summary: {
        totalSignals: feed.length,
        totalDailyUsd,
        totalWeeklyUsd,
      },
      perWorkspace,
    });
  } catch (error) {
    console.error("[signals] Failed to aggregate signal data:", error);
    return NextResponse.json(
      { error: "Failed to aggregate signal data" },
      { status: 500 }
    );
  }
}
