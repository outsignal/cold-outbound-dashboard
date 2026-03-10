import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateInsights } from "@/lib/insights/generate";

/**
 * GET /api/insights?workspace=<slug>&status=<status>&category=<category>
 *
 * List insights for a workspace filtered by status and/or category.
 * For status "active": also includes snoozed insights whose snoozedUntil has expired.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspace = url.searchParams.get("workspace");
  const status = url.searchParams.get("status") ?? "active";
  const category = url.searchParams.get("category");

  if (!workspace) {
    return NextResponse.json(
      { error: "workspace query param is required" },
      { status: 400 },
    );
  }

  try {
    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { workspaceSlug: workspace };

    if (status === "active") {
      // Include active insights AND snoozed insights that have expired
      where.OR = [
        { status: "active" },
        {
          status: "snoozed",
          snoozedUntil: { lt: new Date() },
        },
      ];
    } else {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    const insights = await prisma.insight.findMany({
      where,
      orderBy: [{ priority: "asc" }, { generatedAt: "desc" }],
    });

    // Parse JSON fields for the response
    const parsed = insights.map((insight) => {
      let evidence: unknown = [];
      let actionParams: unknown = null;
      let executionResult: unknown = null;

      try {
        evidence = JSON.parse(insight.evidence);
      } catch {
        evidence = [];
      }

      if (insight.actionParams) {
        try {
          actionParams = JSON.parse(insight.actionParams);
        } catch {
          actionParams = null;
        }
      }

      if (insight.executionResult) {
        try {
          executionResult = JSON.parse(insight.executionResult);
        } catch {
          executionResult = null;
        }
      }

      return {
        ...insight,
        evidence,
        actionParams,
        executionResult,
      };
    });

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[insights GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/insights
 * Body: { workspaceSlug: string }
 *
 * Manual refresh - triggers insight generation for the given workspace.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceSlug } = body;

    if (!workspaceSlug || typeof workspaceSlug !== "string") {
      return NextResponse.json(
        { error: "workspaceSlug is required" },
        { status: 400 },
      );
    }

    const count = await generateInsights(workspaceSlug);

    return NextResponse.json({
      count,
      message: `Generated ${count} insights`,
    });
  } catch (err) {
    console.error("[insights POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 },
    );
  }
}
