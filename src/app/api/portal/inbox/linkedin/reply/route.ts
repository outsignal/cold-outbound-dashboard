import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-session";
import { prisma } from "@/lib/db";
import { enqueueAction } from "@/lib/linkedin/queue";

/**
 * POST /api/portal/inbox/linkedin/reply
 *
 * Queues a LinkedIn reply for delivery via the Railway worker.
 * Creates a LinkedInAction with priority 1 (warm lead fast-track)
 * and returns the actionId for status polling.
 */
export async function POST(request: NextRequest) {
  // 1. Auth via portal session
  let workspaceSlug: string;
  try {
    const session = await getPortalSession();
    workspaceSlug = session.workspaceSlug;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse request body
  let conversationId: string | undefined;
  let message: string | undefined;
  try {
    const body = await request.json();
    conversationId = body.conversationId;
    message = body.message;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // 3. Validate required fields
  if (!conversationId || typeof conversationId !== "string" || conversationId.trim() === "") {
    return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || message.trim() === "") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // 4. Resolve conversation (scoped to workspace)
  const conv = await prisma.linkedInConversation.findFirst({
    where: { id: conversationId, workspaceSlug },
    select: { senderId: true, personId: true },
  });

  // 5. 404 if conversation not found in this workspace
  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // 6. 422 if personId not matched — can't queue without a Person record
  if (!conv.personId) {
    return NextResponse.json(
      { error: "Cannot queue reply: lead not matched to a Person record" },
      { status: 422 }
    );
  }

  // 7. Enqueue LinkedIn action with priority 1 (warm lead fast-track)
  const actionId = await enqueueAction({
    senderId: conv.senderId,
    personId: conv.personId,
    workspaceSlug,
    actionType: "message",
    messageBody: message,
    priority: 1, // warm lead fast-track
    scheduledFor: new Date(), // immediate
  });

  // 8. Return actionId for polling
  return NextResponse.json({ actionId }, { status: 201 });
}
