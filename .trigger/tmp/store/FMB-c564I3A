import {
  classifyReply
} from "../../../chunk-KWQJFLQW.mjs";
import {
  notifyReply
} from "../../../chunk-HLKVV5ZA.mjs";
import "../../../chunk-OCSVRKXM.mjs";
import "../../../chunk-7W7UG4Z3.mjs";
import "../../../chunk-GS4UDRHQ.mjs";
import "../../../chunk-ZCLH4YM5.mjs";
import "../../../chunk-W7HBEXJ4.mjs";
import "../../../chunk-6UNNRELO.mjs";
import {
  require_default
} from "../../../chunk-6DNKPBNV.mjs";
import {
  anthropicQueue
} from "../../../chunk-6VUJNIEH.mjs";
import {
  task
} from "../../../chunk-TXOC7UMT.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/process-reply.ts
init_esm();
var import_client = __toESM(require_default());
var prisma = new import_client.PrismaClient();
var processReply = task({
  id: "process-reply",
  queue: anthropicQueue,
  maxDuration: 60,
  // 1 min — classification + notify only (AI suggestion runs in separate task)
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1e3,
    maxTimeoutInMs: 1e4
  },
  run: /* @__PURE__ */ __name(async (payload) => {
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
      sequenceStep
    } = payload;
    let outboundSubject = null;
    let outboundBody = null;
    let outsignalCampaignId = null;
    let outsignalCampaignName = null;
    if (campaignId) {
      try {
        const campaign = await prisma.campaign.findFirst({
          where: { emailBisonCampaignId: parseInt(campaignId) },
          select: { id: true, name: true, emailSequence: true }
        });
        if (campaign) {
          outsignalCampaignId = campaign.id;
          outsignalCampaignName = campaign.name;
          if (campaign.emailSequence && sequenceStep != null) {
            try {
              const steps = JSON.parse(campaign.emailSequence);
              const matchedStep = steps.find((s) => s.position === sequenceStep);
              if (matchedStep) {
                outboundSubject = matchedStep.subjectLine ?? null;
                outboundBody = matchedStep.body ?? null;
              }
            } catch {
            }
          }
        }
      } catch {
      }
    }
    let personId = null;
    try {
      const person = await prisma.person.findUnique({
        where: { email: replyFromEmail },
        select: { id: true }
      });
      personId = person?.id ?? null;
    } catch {
    }
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
        direction
      },
      update: {
        bodyText: replyBodyText,
        subject,
        senderName: replyFromName,
        htmlBody: replyHtmlBody ?? void 0,
        interested,
        emailBisonParentId: replyParentId ?? void 0,
        ebSenderEmailId: replySenderEmailId ?? void 0
      }
    });
    const replyId = reply.id;
    let classificationIntent = null;
    let classificationSentiment = null;
    try {
      const classification = await classifyReply({
        subject,
        bodyText: reply.bodyText,
        senderName: reply.senderName,
        outboundSubject: reply.outboundSubject,
        outboundBody: reply.outboundBody
      });
      await prisma.reply.update({
        where: { id: replyId },
        data: {
          intent: classification.intent,
          sentiment: classification.sentiment,
          objectionSubtype: classification.objectionSubtype,
          classificationSummary: classification.summary,
          classifiedAt: /* @__PURE__ */ new Date()
        }
      });
      classificationIntent = classification.intent;
      classificationSentiment = classification.sentiment;
      console.log(
        `[process-reply] Classified ${replyFromEmail}: intent=${classification.intent} sentiment=${classification.sentiment}`
      );
    } catch (err) {
      console.error("[process-reply] Classification failed, retry cron will pick it up:", err);
    }
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
        replyId
      });
    } catch (err) {
      console.error("[process-reply] Notification error:", err);
    }
    const replyTriggerEvents = ["LEAD_REPLIED", "LEAD_INTERESTED"];
    if (replyTriggerEvents.includes(eventType) && textBody) {
      try {
        const result = await generateText({
          model: anthropic("claude-haiku-4-5-20251001"),
          system: "You are a helpful sales reply assistant. Write a brief, conversational response to an incoming email. Keep it under 70 words, sound human and natural, reference what they said, and move the conversation forward. Use a soft question CTA. No em dashes. No spintax. No merge variables.",
          prompt: `Lead: ${leadName ?? leadEmail}
Email: ${leadEmail}
Subject: ${subject ?? "(no subject)"}
Their message: ${textBody}${interested ? "\nNote: This lead is marked as INTERESTED." : ""}`
        });
        const suggestion = result.text;
        console.log(
          `[process-reply] AI suggestion generated for ${leadEmail} (${suggestion.length} chars)`
        );
        await prisma.reply.update({
          where: { id: replyId },
          data: { aiSuggestedReply: suggestion }
        }).catch((err) => {
          console.error("[process-reply] Failed to persist AI suggestion:", err);
        });
        const workspace = await prisma.workspace.findUnique({
          where: { slug: workspaceSlug },
          select: { slackChannelId: true }
        });
        const suggestionText = `*Suggested Response for ${leadName || leadEmail}:*
${suggestion}`;
        if (workspace?.slackChannelId) {
          await postMessage(workspace.slackChannelId, suggestionText).catch(() => {
          });
        }
        const repliesChannelId = process.env.REPLIES_SLACK_CHANNEL_ID;
        if (repliesChannelId) {
          await postMessage(repliesChannelId, suggestionText).catch(() => {
          });
        }
      } catch (err) {
        console.error("[process-reply] AI suggestion generation failed:", err);
      }
    }
    return {
      replyId,
      classified: classificationIntent !== null,
      intent: classificationIntent,
      sentiment: classificationSentiment
    };
  }, "run")
});
export {
  processReply
};
//# sourceMappingURL=process-reply.mjs.map
