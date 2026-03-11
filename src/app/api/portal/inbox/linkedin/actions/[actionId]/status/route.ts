import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-session";
import { prisma } from "@/lib/db";

/**
 * GET /api/portal/inbox/linkedin/actions/[actionId]/status
 *
 * Returns the current status of a LinkedInAction for optimistic UI polling.
 * Used to update the reply badge from "Queued" → "Sent" after the worker
 * processes the action.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  // 1. Auth via portal session
  let workspaceSlug: string;
  try {
    const session = await getPortalSession();
    workspaceSlug = session.workspaceSlug;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { actionId } = await params;

  // 2. Query action scoped to workspace
  const action = await prisma.linkedInAction.findFirst({
    where: { id: actionId, workspaceSlug },
    select: { status: true, completedAt: true },
  });

  // 3. 404 if action not found in this workspace
  if (!action) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  // 4. Return status for polling
  return NextResponse.json({
    status: action.status,
    completedAt: action.completedAt?.toISOString() ?? null,
  });
}
