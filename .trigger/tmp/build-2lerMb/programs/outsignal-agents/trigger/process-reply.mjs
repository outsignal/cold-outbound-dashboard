import {
  prisma
} from "../../../chunk-6UNNRELO.mjs";
import {
  classifyReply
} from "../../../chunk-YJVUOMGR.mjs";
import {
  anthropicQueue
} from "../../../chunk-6VUJNIEH.mjs";
import {
  Resend,
  require_dist
} from "../../../chunk-ZU5VV4KV.mjs";
import {
  anthropic,
  generateText
} from "../../../chunk-FKGDK3GL.mjs";
import "../../../chunk-W7HBEXJ4.mjs";
import {
  require_default
} from "../../../chunk-6DNKPBNV.mjs";
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

// src/lib/notifications.ts
init_esm();

// src/lib/slack.ts
init_esm();
var import_web_api = __toESM(require_dist());
function getSlackClient() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  return new import_web_api.WebClient(token);
}
__name(getSlackClient, "getSlackClient");
async function postMessage(channelId, text, blocks) {
  const slack = getSlackClient();
  if (!slack) {
    console.warn("SLACK_BOT_TOKEN not set, skipping message");
    return;
  }
  await slack.chat.postMessage({
    channel: channelId,
    text,
    blocks
  });
}
__name(postMessage, "postMessage");

// src/lib/resend.ts
init_esm();

// src/lib/notification-audit.ts
init_esm();

// src/lib/notify.ts
init_esm();

// src/lib/notification-guard.ts
init_esm();
function verifyEmailRecipients(recipients, intent, context) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (intent === "admin") {
    const allowed = recipients.filter((r) => r === adminEmail);
    const blocked = recipients.filter((r) => r !== adminEmail);
    if (blocked.length > 0) {
      console.error(
        `[notification-guard] BLOCKED ${context}: attempted to send admin notification to non-admin emails: ${blocked.join(", ")}`
      );
    }
    if (allowed.length === 0 && recipients.length > 0) {
      console.error(
        `[notification-guard] BLOCKED ${context}: no valid admin recipients. Is ADMIN_EMAIL set?`
      );
    }
    return allowed;
  }
  return recipients;
}
__name(verifyEmailRecipients, "verifyEmailRecipients");
function verifySlackChannel(channelId, intent, context) {
  const opsChannelId = process.env.OPS_SLACK_CHANNEL_ID;
  if (intent === "admin") {
    if (channelId !== opsChannelId) {
      console.error(
        `[notification-guard] BLOCKED ${context}: attempted to send admin notification to non-ops Slack channel: ${channelId}`
      );
      return false;
    }
    return true;
  }
  if (channelId === opsChannelId) {
    console.error(
      `[notification-guard] BLOCKED ${context}: attempted to send client notification to ops Slack channel`
    );
    return false;
  }
  return true;
}
__name(verifySlackChannel, "verifySlackChannel");

// src/lib/notify.ts
var SEVERITY_EMOJI = {
  info: "ℹ️",
  warning: "⚠️",
  error: "🚨"
};
async function notify(params) {
  const severity = params.severity ?? "info";
  try {
    await prisma.notification.create({
      data: {
        type: params.type,
        severity,
        title: params.title,
        message: params.message ?? null,
        workspaceSlug: params.workspaceSlug ?? null,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : void 0
      }
    });
  } catch (err) {
    console.error("[notify] Failed to write notification to DB:", err);
  }
  const channelId = process.env.OPS_SLACK_CHANNEL_ID;
  if (channelId) {
    if (!verifySlackChannel(channelId, "admin", "notify")) return;
    try {
      const emoji = SEVERITY_EMOJI[severity] ?? "ℹ️";
      const parts = [
        `${emoji} *${params.title}*`
      ];
      if (params.workspaceSlug) {
        parts.push(`Workspace: \`${params.workspaceSlug}\``);
      }
      if (params.message) {
        parts.push(params.message);
      }
      await audited(
        { notificationType: params.type, channel: "slack", recipient: channelId, workspaceSlug: params.workspaceSlug },
        () => postMessage(channelId, parts.join("\n")),
        { skipOpsAlert: true }
      );
    } catch (err) {
      console.error("[notify] Failed to post to Slack:", err);
    }
  }
}
__name(notify, "notify");

// src/lib/notification-audit.ts
async function audited(entry, sendFn, opts) {
  const start = Date.now();
  try {
    await sendFn();
    writeAudit({ ...entry, status: "sent", durationMs: Date.now() - start }).catch(
      (err) => console.error("[notification-audit] Failed to write audit log:", err)
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    writeAudit({
      ...entry,
      status: "failed",
      errorMessage,
      durationMs: Date.now() - start
    }).catch(
      (auditErr) => console.error("[notification-audit] Failed to write failure audit:", auditErr)
    );
    if (!opts?.skipOpsAlert) {
      alertOpsOnFailure(entry, errorMessage).catch(
        (alertErr) => console.error("[notification-audit] Failed to alert ops:", alertErr)
      );
    }
    throw err;
  }
}
__name(audited, "audited");
async function writeAudit(data) {
  await prisma.notificationAuditLog.create({
    data: {
      notificationType: data.notificationType,
      channel: data.channel,
      recipient: data.recipient,
      status: data.status,
      errorMessage: data.errorMessage ?? null,
      workspaceSlug: data.workspaceSlug ?? null,
      metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : void 0,
      durationMs: data.durationMs ?? null
    }
  });
}
__name(writeAudit, "writeAudit");
async function alertOpsOnFailure(entry, errorMessage) {
  await notify({
    type: "error",
    severity: "error",
    title: `Notification failed: ${entry.notificationType} (${entry.channel})`,
    message: `Recipient: ${entry.recipient}
Error: ${errorMessage}`,
    workspaceSlug: entry.workspaceSlug,
    metadata: entry.metadata
  });
}
__name(alertOpsOnFailure, "alertOpsOnFailure");

// src/lib/resend.ts
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}
__name(getResendClient, "getResendClient");
async function sendNotificationEmail(params) {
  const resend = getResendClient();
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping email notification");
    return;
  }
  const from = process.env.RESEND_FROM ?? "Outsignal <notifications@outsignal.ai>";
  await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html
  });
}
__name(sendNotificationEmail, "sendNotificationEmail");

// src/lib/notifications.ts
async function notifyReply(params) {
  if (params.replyId) {
    const replyRecord = await prisma.reply.findUnique({
      where: { id: params.replyId },
      select: { notifiedAt: true }
    });
    if (replyRecord?.notifiedAt) {
      console.log(`[notifyReply] Skipping already-notified reply ${params.replyId}`);
      return;
    }
  }
  const workspace = await prisma.workspace.findUnique({
    where: { slug: params.workspaceSlug }
  });
  if (!workspace) return;
  const preview = params.bodyPreview ? params.bodyPreview.slice(0, 300) : "(no body)";
  const label = params.interested ? "Interested Reply" : "New Reply";
  const outsignalInboxUrl = "https://app.outsignal.ai/inbox";
  const slackBlocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `[${workspace.name}] ${label} Received`
      }
    },
    ...params.leadName ? [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Name:* ${params.leadName}`
        }
      }
    ] : [],
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*From:* ${params.leadEmail}`
      }
    },
    ...params.subject ? [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Subject:* ${params.subject}`
        }
      }
    ] : [],
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: preview
      }
    },
    ...params.suggestedResponse ? [
      {
        type: "divider"
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Suggested Response:*
${params.suggestedResponse}`
        }
      }
    ] : [],
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Reply in Outsignal"
          },
          url: outsignalInboxUrl
        }
      ]
    }
  ];
  const slackFallback = `${label} from ${params.leadName ?? params.leadEmail}`;
  if (workspace.slackChannelId) {
    if (verifySlackChannel(workspace.slackChannelId, "client", "notifyReply")) {
      try {
        await audited(
          { notificationType: "reply", channel: "slack", recipient: workspace.slackChannelId, workspaceSlug: params.workspaceSlug },
          () => postMessage(workspace.slackChannelId, slackFallback, slackBlocks)
        );
      } catch (err) {
        console.error("Slack client notification failed:", err);
      }
    }
  }
  const repliesSlackChannelId = process.env.REPLIES_SLACK_CHANNEL_ID;
  if (repliesSlackChannelId) {
    if (verifySlackChannel(repliesSlackChannelId, "admin", "notifyReply")) {
      try {
        await audited(
          { notificationType: "reply", channel: "slack", recipient: repliesSlackChannelId, workspaceSlug: params.workspaceSlug },
          () => postMessage(repliesSlackChannelId, slackFallback, slackBlocks)
        );
      } catch (err) {
        console.error("Slack admin notification failed:", err);
      }
    }
  }
  const emailSubjectLine = `[${workspace.name}] ${label} from ${params.leadName ?? params.leadEmail}`;
  const emailHtml = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:#18181b;padding:20px 32px;border-radius:8px 8px 0 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;letter-spacing:3px;color:#F0FF7A;">OUTSIGNAL</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background-color:#ffffff;padding:32px 32px 24px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <!-- Title row -->
              <tr>
                <td style="padding-bottom:6px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#18181b;line-height:1.3;">${label} Received</td>
                      <td style="padding-left:12px;">${params.interested ? `<span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;color:#065f46;background-color:#d1fae5;padding:4px 10px;border-radius:100px;">Interested</span>` : ""}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#71717a;padding-bottom:24px;line-height:1.5;">${workspace.name}</td>
              </tr>
              <!-- Sender details card -->
              <tr>
                <td style="padding-bottom:24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fafafa;border-radius:8px;border:1px solid #e4e4e7;">
${params.leadName ? `                    <tr>
                      <td style="padding:14px 18px 0 18px;">
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:#a1a1aa;margin:0 0 4px 0;text-transform:uppercase;">Name</p>
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#18181b;margin:0;font-weight:600;">${params.leadName}</p>
                      </td>
                    </tr>` : ""}
                    <tr>
                      <td style="padding:${params.leadName ? "12px" : "14px"} 18px 0 18px;">
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:#a1a1aa;margin:0 0 4px 0;text-transform:uppercase;">From</p>
                        <p style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:14px;color:#18181b;margin:0;">${params.leadEmail}</p>
                      </td>
                    </tr>
${params.subject ? `                    <tr>
                      <td style="padding:12px 18px 0 18px;">
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:#a1a1aa;margin:0 0 4px 0;text-transform:uppercase;">Subject</p>
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#18181b;margin:0;">${params.subject}</p>
                      </td>
                    </tr>` : ""}
                    <tr><td style="padding-bottom:14px;"></td></tr>
                  </table>
                </td>
              </tr>
              <!-- Preview section -->
              <tr>
                <td style="padding-bottom:24px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:#a1a1aa;margin:0 0 10px 0;text-transform:uppercase;">Message Preview</p>
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#3f3f46;margin:0;white-space:pre-wrap;">${preview}</p>
                </td>
              </tr>
${params.suggestedResponse ? `              <!-- Suggested response section -->
              <tr>
                <td style="padding-bottom:24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                    <tr>
                      <td style="border-top:1px solid #e4e4e7;padding-top:20px;">
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:#a1a1aa;margin:0 0 10px 0;text-transform:uppercase;">Suggested Response</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="background-color:#fafafa;border-left:3px solid #F0FF7A;padding:14px 18px;border-radius:0 6px 6px 0;">
                              <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap;margin:0;color:#374151;">${params.suggestedResponse}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>` : ""}
              <!-- CTA button -->
              <tr>
                <td style="padding-top:8px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background-color:#F0FF7A;border-radius:8px;">
                        <a href="${outsignalInboxUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#18181b;text-decoration:none;">Reply in Outsignal</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#fafafa;padding:20px 32px;border-top:1px solid #e4e4e7;border-radius:0 0 8px 8px;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a1a1aa;margin:0;line-height:1.5;">Outsignal &mdash; Sent to ${workspace.name} notification recipients.<br/>You received this because you are subscribed to reply notifications.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
  if (workspace.notificationEmails) {
    try {
      const recipients = JSON.parse(workspace.notificationEmails);
      const verified = verifyEmailRecipients(recipients, "client", "notifyReply");
      if (verified.length > 0) {
        await audited(
          { notificationType: "reply", channel: "email", recipient: verified.join(","), workspaceSlug: params.workspaceSlug },
          () => sendNotificationEmail({
            to: verified,
            subject: emailSubjectLine,
            html: emailHtml
          })
        );
      }
    } catch (err) {
      console.error("Email client notification failed:", err);
    }
  }
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    try {
      const verified = verifyEmailRecipients([adminEmail], "admin", "notifyReply");
      if (verified.length > 0) {
        await audited(
          { notificationType: "reply", channel: "email", recipient: verified.join(","), workspaceSlug: params.workspaceSlug },
          () => sendNotificationEmail({
            to: verified,
            subject: emailSubjectLine,
            html: emailHtml
          })
        );
      }
    } catch (err) {
      console.error("Email admin notification failed:", err);
    }
  }
  if (params.replyId) {
    await prisma.reply.update({
      where: { id: params.replyId },
      data: { notifiedAt: /* @__PURE__ */ new Date() }
    });
  }
}
__name(notifyReply, "notifyReply");

// trigger/process-reply.ts
var prisma2 = new import_client.PrismaClient();
var processReply = task({
  id: "process-reply",
  queue: anthropicQueue,
  maxDuration: 120,
  // 2 min — classification + notify + AI suggestion
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
        const campaign = await prisma2.campaign.findFirst({
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
      const person = await prisma2.person.findUnique({
        where: { email: replyFromEmail },
        select: { id: true }
      });
      personId = person?.id ?? null;
    } catch {
    }
    const reply = await prisma2.reply.upsert({
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
      await prisma2.reply.update({
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
        await prisma2.reply.update({
          where: { id: replyId },
          data: { aiSuggestedReply: suggestion }
        }).catch((err) => {
          console.error("[process-reply] Failed to persist AI suggestion:", err);
        });
        const workspace = await prisma2.workspace.findUnique({
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
