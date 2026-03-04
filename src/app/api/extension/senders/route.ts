import { NextRequest, NextResponse } from "next/server";
import { getExtensionSession, extensionCorsHeaders } from "@/lib/extension-auth";
import { prisma } from "@/lib/db";

/**
 * OPTIONS /api/extension/senders
 * CORS preflight.
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: extensionCorsHeaders(request) });
}

/**
 * GET /api/extension/senders
 * Returns all senders for the token's workspace.
 *
 * Requires: Bearer token (workspace-scoped or sender-scoped)
 */
export async function GET(request: NextRequest) {
  const cors = extensionCorsHeaders(request);
  try {
    const session = getExtensionSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: cors },
      );
    }

    const senders = await prisma.sender.findMany({
      where: { workspaceSlug: session.workspaceSlug },
      select: {
        id: true,
        name: true,
        emailAddress: true,
        linkedinProfileUrl: true,
        sessionStatus: true,
        healthStatus: true,
      },
    });

    return NextResponse.json({ senders }, { headers: cors });
  } catch (error) {
    console.error("[extension/senders] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: cors },
    );
  }
}
