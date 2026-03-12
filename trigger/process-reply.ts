import { task } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { classifyReply } from "@/lib/classification/classify-reply";
import { notifyReply } from "@/lib/notifications";
import { postMessage } from "@/lib/slack";
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
  maxDuration: 120, // 2 min — classification + notify + AI suggestion
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
    // Step 4: Generate AI reply suggestion
    // ----------------------------------------------------------------

    const replyTriggerEvents = ["LEAD_REPLIED", "LEAD_INTERESTED"];
    if (replyTriggerEvents.includes(eventType) && textBody) {
      try {
        const result = await generateText({
          model: anthropic("claude-haiku-4-5-20251001"),
          system:
            "You are a helpful sales reply assistant. Write a brief, conversational response to an incoming email. Keep it under 70 words, sound human and natural, reference what they said, and move the conversation forward. Use a soft question CTA. No em dashes. No spintax. No merge variables.",
          prompt: `Lead: ${leadName ?? leadEmail}
Email: ${leadEmail}
Subject: ${subject ?? "(no subject)"}
Their message: ${textBody}${interested ? "\nNote: This lead is marked as INTERESTED." : ""}`,
        });

        const suggestion = result.text;

        console.log(
          `[process-reply] AI suggestion generated for ${leadEmail} (${suggestion.length} chars)`,
        );

        // Persist AI suggestion to Reply record
        await prisma.reply.update({
          where: { id: replyId },
          data: { aiSuggestedReply: suggestion },
        }).catch((err: unknown) => {
          console.error("[process-reply] Failed to persist AI suggestion:", err);
        });

        // Post follow-up Slack messages with AI suggestion
        const workspace = await prisma.workspace.findUnique({
          where: { slug: workspaceSlug },
          select: { slackChannelId: true },
        });

        const suggestionText = `*Suggested Response for ${leadName || leadEmail}:*\n${suggestion}`;

        if (workspace?.slackChannelId) {
          await postMessage(workspace.slackChannelId, suggestionText).catch(() => {});
        }

        const repliesChannelId = process.env.REPLIES_SLACK_CHANNEL_ID;
        if (repliesChannelId) {
          await postMessage(repliesChannelId, suggestionText).catch(() => {});
        }
      } catch (err) {
        console.error("[process-reply] AI suggestion generation failed:", err);
        // Non-blocking — notification already fired without suggestion
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
