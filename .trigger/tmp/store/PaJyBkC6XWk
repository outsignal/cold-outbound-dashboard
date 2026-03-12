import {
  classifyReply
} from "../../../chunk-NCVOEKER.mjs";
import {
  notifyReply
} from "../../../chunk-JKH4RSVT.mjs";
import "../../../chunk-OCSVRKXM.mjs";
import {
  anthropicQueue
} from "../../../chunk-V5FCZ2QB.mjs";
import "../../../chunk-I345TI6W.mjs";
import "../../../chunk-W7HBEXJ4.mjs";
import "../../../chunk-7W7UG4Z3.mjs";
import "../../../chunk-GS4UDRHQ.mjs";
import "../../../chunk-6UNNRELO.mjs";
import {
  require_default
} from "../../../chunk-6DNKPBNV.mjs";
import {
  task,
  tasks
} from "../../../chunk-ZD6M6VDX.mjs";
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
        await tasks.trigger("generate-suggestion", {
          replyId,
          workspaceSlug
        });
        console.log(`[process-reply] Triggered generate-suggestion for reply ${replyId}`);
      } catch (err) {
        console.error("[process-reply] Failed to trigger generate-suggestion:", err);
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
