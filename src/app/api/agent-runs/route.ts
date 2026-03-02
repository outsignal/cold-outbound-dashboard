import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const agent = url.searchParams.get("agent");
  const status = url.searchParams.get("status");
  const workspace = url.searchParams.get("workspace");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")));

  const where: Record<string, unknown> = {};
  if (agent) where.agent = agent;
  if (status) where.status = status;
  if (workspace) where.workspaceSlug = workspace;

  const [runs, total] = await Promise.all([
    prisma.agentRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.agentRun.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ runs, total, page, totalPages });
}
