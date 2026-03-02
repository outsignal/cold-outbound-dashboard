import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  type:
    | "email_sent"
    | "email_opened"
    | "email_replied"
    | "email_bounced"
    | "linkedin_connect"
    | "linkedin_message"
    | "linkedin_profile_view"
    | "enrichment"
    | "other";
  title: string;
  detail?: string;
  workspace?: string;
  timestamp: string; // ISO
  metadata?: Record<string, unknown>;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapWebhookEventType(
  eventType: string
): TimelineEvent["type"] {
  const map: Record<string, TimelineEvent["type"]> = {
    EMAIL_SENT: "email_sent",
    EMAIL_OPENED: "email_opened",
    LEAD_REPLIED: "email_replied",
    LEAD_INTERESTED: "email_replied",
    BOUNCED: "email_bounced",
    EMAIL_BOUNCED: "email_bounced",
    UNTRACKED_REPLY_RECEIVED: "email_replied",
  };
  return map[eventType] ?? "other";
}

function mapWebhookEventTitle(eventType: string): string {
  const map: Record<string, string> = {
    EMAIL_SENT: "Email sent",
    EMAIL_OPENED: "Email opened",
    LEAD_REPLIED: "Replied to email",
    LEAD_INTERESTED: "Marked interested",
    BOUNCED: "Email bounced",
    EMAIL_BOUNCED: "Email bounced",
    UNTRACKED_REPLY_RECEIVED: "Reply received",
  };
  return map[eventType] ?? eventType.replace(/_/g, " ").toLowerCase();
}

function mapLinkedInActionType(
  actionType: string
): TimelineEvent["type"] {
  const map: Record<string, TimelineEvent["type"]> = {
    connect: "linkedin_connect",
    message: "linkedin_message",
    profile_view: "linkedin_profile_view",
    check_connection: "linkedin_profile_view",
  };
  return map[actionType] ?? "other";
}

function mapLinkedInActionTitle(actionType: string, status: string): string {
  const titles: Record<string, string> = {
    connect: "Connection request sent",
    message: "LinkedIn message sent",
    profile_view: "Profile viewed",
    check_connection: "Connection status checked",
  };
  const title = titles[actionType] ?? actionType.replace(/_/g, " ");
  if (status === "failed") return `${title} (failed)`;
  if (status === "pending") return `${title} (pending)`;
  return title;
}

// ─── GET /api/people/[id]/timeline ───────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Look up the person to get their email
  const person = await prisma.person.findUnique({
    where: { id },
    select: { id: true, email: true },
  });

  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  // Query all event sources in parallel
  const [webhookEvents, linkedInActions, enrichmentLogs] = await Promise.all([
    prisma.webhookEvent.findMany({
      where: { leadEmail: person.email },
      orderBy: { receivedAt: "desc" },
      take: 100,
    }),
    prisma.linkedInAction.findMany({
      where: { personId: person.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.enrichmentLog.findMany({
      where: { entityId: person.id, entityType: "person" },
      orderBy: { runAt: "desc" },
      take: 50,
    }),
  ]);

  // Normalize to unified timeline format
  const events: TimelineEvent[] = [];

  for (const ev of webhookEvents) {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(ev.payload) as Record<string, unknown>;
    } catch {
      // ignore malformed payload
    }

    const subject =
      (payload.subject as string) ??
      (payload.campaignName as string) ??
      undefined;

    events.push({
      id: ev.id,
      type: mapWebhookEventType(ev.eventType),
      title: mapWebhookEventTitle(ev.eventType),
      detail: subject,
      workspace: ev.workspace,
      timestamp: ev.receivedAt.toISOString(),
      metadata: {
        campaignId: ev.campaignId,
        senderEmail: ev.senderEmail,
        eventType: ev.eventType,
      },
    });
  }

  for (const action of linkedInActions) {
    const messagePreview = action.messageBody
      ? action.messageBody.slice(0, 80) + (action.messageBody.length > 80 ? "…" : "")
      : undefined;

    events.push({
      id: action.id,
      type: mapLinkedInActionType(action.actionType),
      title: mapLinkedInActionTitle(action.actionType, action.status),
      detail: messagePreview,
      workspace: action.workspaceSlug,
      timestamp: (action.completedAt ?? action.scheduledFor).toISOString(),
      metadata: {
        actionType: action.actionType,
        status: action.status,
        senderId: action.senderId,
        campaignName: action.campaignName,
      },
    });
  }

  for (const log of enrichmentLogs) {
    let fieldsWritten: string[] = [];
    try {
      fieldsWritten = JSON.parse(log.fieldsWritten ?? "[]") as string[];
    } catch {
      // ignore
    }

    events.push({
      id: log.id,
      type: "enrichment",
      title: `Enriched via ${log.provider}`,
      detail:
        log.status === "error"
          ? `Error: ${log.errorMessage ?? "unknown"}`
          : fieldsWritten.length > 0
          ? `Fields: ${fieldsWritten.join(", ")}`
          : undefined,
      workspace: log.workspaceSlug ?? undefined,
      timestamp: log.runAt.toISOString(),
      metadata: {
        provider: log.provider,
        status: log.status,
        costUsd: log.costUsd,
        fieldsWritten,
      },
    });
  }

  // Sort all events by timestamp descending
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return NextResponse.json({ events, total: events.length });
}
