import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/senders/[id]/reactivate
 * Manually reactivates a hard-flagged sender (blocked or session_expired).
 * Resets healthStatus to "healthy", clears healthFlaggedAt,
 * and creates an audit SenderHealthEvent.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sender = await prisma.sender.findUnique({ where: { id } });

    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    if (sender.healthStatus !== "blocked" && sender.healthStatus !== "session_expired") {
      return NextResponse.json(
        { error: "Sender is not in a hard-flagged state" },
        { status: 400 }
      );
    }

    // Atomically reset health status and create audit event
    await prisma.$transaction([
      prisma.sender.update({
        where: { id },
        data: {
          healthStatus: "healthy",
          healthFlaggedAt: null,
        },
      }),
      prisma.senderHealthEvent.create({
        data: {
          senderId: id,
          status: "healthy",
          reason: "admin_reactivated",
          detail: "Manually reactivated by admin",
        },
      }),
    ]);

    return NextResponse.json({ ok: true, healthStatus: "healthy" });
  } catch (error) {
    console.error("Reactivate sender error:", error);
    return NextResponse.json({ error: "Failed to reactivate sender" }, { status: 500 });
  }
}
