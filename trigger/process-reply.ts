import { task, tasks } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { classifyReply } from "@/lib/classification/classify-reply";
import { notifyReply } from "@/lib/notifications";
import { anthropicQueue } from "./queues";

// PrismaClient at module scope — not inside run() (pattern from smoke-test.ts)
const prisma = new PrismaClient();

export interface ProcessReplyPayload {
  workspaceSlug: string;
  ebReplyId: number;
  eventType: string;
  leadEmail: string;
  leadName: string | null;
  senderEmail: string | null;
  subject: string | null;
  textBody: string | null;
  interested: boolean;
  campaignId: string | null;
  webhookEventId: string;
  replyFromEmail: string;
  replyFromName: string | null;
  replyBodyText: string;
  replyHtmlBody: string | null;
  replyReceivedAt: string; // ISO string (dates don't serialize over JSON)
  replyParentId: number | null;
  replySenderEmailId: number | null;
  direction: "inbound" | "outbound";
  sequenceStep: number | null;
}

export const processReply = task({
  id: "process-reply",
  queue: anthropicQueue,
  maxDuration: 60, // 1 min — classification + notify only (AI suggestion runs in separate task)
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 10_000,
  },

  run: async (payload: ProcessReplyPayload) => {
    const {
      workspaceSlug,
      ebReplyId,
      eventType,
      leadEmail,
      leadName,
      senderEmail,
      subject,
      textBody,
      interested,
      campaignId,
      webhookEventId,
      replyFromEmail,
      replyFromName,
      replyBodyText,
      replyHtmlBody,
      replyReceivedAt,
      replyParentId,
      replySenderEmailId,
      direction,
      sequenceStep,
    } = payload;

    // ----------------------------------------------------------------
    // Step 1: Upsert Reply record (dedup by emailBisonReplyId)
    // ----------------------------------------------------------------

    // Look up outbound email snapshot from Outsignal campaign
    let outboundSubject: string | null = null;
    let outboundBody: string | null = null;
    let outsignalCampaignId: string | null = null;
    let outsignalCampaignName: string | null = null;

    if (campaignId) {
      try {
        const campaign = await prisma.campaign.findFirst({
          where: { emailBisonCampaignId: parseInt(campaignId) },
          select: { id: true, name: true, emailSequence: true },
        });
        if (campaign) {
          outsignalCampaignId = campaign.id;
          outsignalCampaignName = campaign.name;
          if (campaign.emailSequence && sequenceStep != null) {
            try {
              const steps = JSON.parse(campaign.emailSequence) as {
                position: number;
                subjectLine?: string;
                body?: string;
              }[];
              const matchedStep = steps.find((s) => s.position === sequenceStep);
              if (matchedStep) {
                outboundSubject = matchedStep.subjectLine ?? null;
                outboundBody = matchedStep.body ?? null;
              }
            } catch {
              // JSON parse failure — skip outbound snapshot
            }
          }
        }
      } catch {
        // Campaign lookup failure — non-blocking
      }
    }

    // Look up personId by replyFromEmail
    let personId: string | null = null;
    try {
      const person = await prisma.person.findUnique({
        where: { email: replyFromEmail },
        select: { id: true },
      });
      personId = person?.id ?? null;
    } catch {
      // Person lookup failure — non-blocking
    }

    // Upsert Reply record
    const reply = await prisma.reply.upsert({
      where: { emailBisonReplyId: ebReplyId },
      create: {
        workspaceSlug,
        senderEmail: replyFromEmail,
        senderName: replyFromName,
        subject,
        bodyText: replyBodyText,
        receivedAt: new Date(replyReceivedAt),
        emailBisonReplyId: ebReplyId,
        campaignId: outsignalCampaignId,
        campaignName: outsignalCampaignName,
        sequenceStep,
        outboundSubject,
        outboundBody,
        source: "webhook",
        webhookEventId,
        personId,
        emailBisonParentId: replyParentId,
        leadEmail: replyFromEmail.toLowerCase() || null,
        htmlBody: replyHtmlBody,
        ebSenderEmailId: replySenderEmailId,
        interested,
        direction,
      },
      update: {
        bodyText: replyBodyText,
        subject,
        senderName: replyFromName,
        htmlBody: replyHtmlBody ?? undefined,
        interested,
        emailBisonParentId: replyParentId ?? undefined,
        ebSenderEmailId: replySenderEmailId ?? undefined,
      },
    });

    const replyId = reply.id;

    // ----------------------------------------------------------------
    // Step 2: Classify reply
    // ----------------------------------------------------------------

    let classificationIntent: string | null = null;
    let classificationSentiment: string | null = null;

    try {
      const classification = await classifyReply({
        subject,
        bodyText: reply.bodyText,
        senderName: reply.senderName,
        outboundSubject: reply.outboundSubject,
        outboundBody: reply.outboundBody,
      });

      await prisma.reply.update({
        where: { id: replyId },
        data: {
          intent: classification.intent,
          sentiment: classification.sentiment,
          objectionSubtype: classification.objectionSubtype,
          classificationSummary: classification.summary,
          classifiedAt: new Date(),
        },
      });

      classificationIntent = classification.intent;
      classificationSentiment = classification.sentiment;

      console.log(
        `[process-reply] Classified ${replyFromEmail}: intent=${classification.intent} sentiment=${classification.sentiment}`,
      );
    } catch (err) {
      console.error("[process-reply] Classification failed, retry cron will pick it up:", err);
      // Non-blocking — reply saved with intent=null, retry-classification cron picks it up
    }

    // ----------------------------------------------------------------
    // Step 3: Notify (notifyReply has notifiedAt guard — safe for retries)
    // ----------------------------------------------------------------

    // Append classification info to body preview if available
    let bodyPreview = textBody;
    if (bodyPreview && classificationIntent && classificationSentiment) {
      bodyPreview = `${bodyPreview} [Intent: ${classificationIntent}, Sentiment: ${classificationSentiment}]`;
    }

    try {
      await notifyReply({
        workspaceSlug,
        leadName,
        leadEmail: leadEmail ?? "unknown",
        senderEmail: senderEmail ?? "unknown",
        subject,
        bodyPreview,
        interested,
        suggestedResponse: null,
        replyId,
      });
    } catch (err) {
      console.error("[process-reply] Notification error:", err);
      // Non-blocking — continue to AI suggestion
    }

    // ----------------------------------------------------------------
    // Step 4: Trigger AI reply suggestion (async — runs as separate task)
    // ----------------------------------------------------------------

    const replyTriggerEvents = ["LEAD_REPLIED", "LEAD_INTERESTED"];
    if (replyTriggerEvents.includes(eventType) && textBody) {
      try {
        await tasks.trigger("generate-suggestion", {
          replyId,
          workspaceSlug,
        });
        console.log(`[process-reply] Triggered generate-suggestion for reply ${replyId}`);
      } catch (err) {
        console.error("[process-reply] Failed to trigger generate-suggestion:", err);
        // Non-blocking — notification already fired, suggestion will be missing but reply is processed
      }
    }

    return {
      replyId,
      classified: classificationIntent !== null,
      intent: classificationIntent,
      sentiment: classificationSentiment,
    };
  },
});
