import { NextRequest, NextResponse } from "next/server";
import { createExtensionToken, extensionCorsHeaders } from "@/lib/extension-auth";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

/**
 * OPTIONS /api/extension/auth
 * CORS preflight for Chrome extension popup fetch calls.
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: extensionCorsHeaders(request) });
}

/**
 * POST /api/extension/auth
 * Authenticate the Chrome extension using a per-sender invite token.
 *
 * Body: { token: string }
 *
 * Returns:
 *   - senderToken: sender-scoped extension auth token
 *   - senderId: the resolved sender's ID
 *   - senderName: display name
 *   - workspaceSlug
 */
export async function POST(request: NextRequest) {
  const cors = extensionCorsHeaders(request);
  try {
    const body = await request.json();
    const { token } = body as { token?: string };

    if (!token || typeof token !== "string" || token.trim() === "") {
      return NextResponse.json(
        { error: "token is required" },
        { status: 400, headers: cors },
      );
    }

    const sender = await prisma.sender.findUnique({
      where: { inviteToken: token.trim() },
      select: {
        id: true,
        name: true,
        workspaceSlug: true,
        sessionStatus: true,
        healthStatus: true,
        lastActiveAt: true,
      },
    });

    if (!sender) {
      return NextResponse.json(
        { error: "Invalid invite token" },
        { status: 401, headers: cors },
      );
    }

    const senderToken = createExtensionToken(sender.workspaceSlug, sender.id);

    return NextResponse.json(
      {
        senderToken,
        senderId: sender.id,
        senderName: sender.name,
        workspaceSlug: sender.workspaceSlug,
        sender: {
          sessionStatus: sender.sessionStatus,
          healthStatus: sender.healthStatus,
          lastActiveAt: sender.lastActiveAt,
        },
      },
      { headers: cors },
    );
  } catch (error) {
    console.error("[extension/auth] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: cors },
    );
  }
}

/**
 * Utility: ensure a sender has an inviteToken, generating one if null.
 * Called lazily when viewing sender cards.
 */
export async function ensureSenderInviteToken(senderId: string): Promise<string> {
  const sender = await prisma.sender.findUnique({
    where: { id: senderId },
    select: { inviteToken: true },
  });

  if (sender?.inviteToken) {
    return sender.inviteToken;
  }

  const newToken = randomUUID();
  await prisma.sender.update({
    where: { id: senderId },
    data: { inviteToken: newToken },
  });
  return newToken;
}
