import { NextRequest, NextResponse } from "next/server";
import { getExtensionSession, extensionCorsHeaders } from "@/lib/extension-auth";
import { prisma } from "@/lib/db";

/**
 * OPTIONS /api/extension/status
 * CORS preflight.
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: extensionCorsHeaders(request) });
}

/**
 * GET /api/extension/status
 * Returns the sender's connection status for the extension popup to display.
 *
 * Requires: Bearer sender-scoped token
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

    if (!session.senderId) {
      return NextResponse.json(
        { error: "Token is workspace-scoped; please select a sender first" },
        { status: 400, headers: cors },
      );
    }

    const sender = await prisma.sender.findUnique({
      where: { id: session.senderId },
      select: {
        id: true,
        name: true,
        sessionStatus: true,
        healthStatus: true,
        lastActiveAt: true,
      },
    });

    if (!sender) {
      return NextResponse.json(
        { error: "Sender not found" },
        { status: 404, headers: cors },
      );
    }

    return NextResponse.json({ sender }, { headers: cors });
  } catch (error) {
    console.error("[extension/status] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: cors },
    );
  }
}
