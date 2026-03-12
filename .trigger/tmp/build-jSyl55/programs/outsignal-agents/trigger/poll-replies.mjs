import {
  getAllWorkspaces,
  getWorkspaceBySlug
} from "../../../chunk-FEDV5KV3.mjs";
import {
  classifyReply
} from "../../../chunk-NCVOEKER.mjs";
import {
  assignSenderForPerson,
  bumpPriority,
  enqueueAction
} from "../../../chunk-5NGDKPHQ.mjs";
import {
  EmailBisonClient
} from "../../../chunk-HYVNS55X.mjs";
import "../../../chunk-I345TI6W.mjs";
import "../../../chunk-W7HBEXJ4.mjs";
import {
  emailBisonQueue
} from "../../../chunk-V5FCZ2QB.mjs";
import {
  notifyReply
} from "../../../chunk-3ZZKUR37.mjs";
import "../../../chunk-UYQWQERQ.mjs";
import "../../../chunk-OCSVRKXM.mjs";
import "../../../chunk-7W7UG4Z3.mjs";
import "../../../chunk-GS4UDRHQ.mjs";
import "../../../chunk-6UNNRELO.mjs";
import {
  require_default
} from "../../../chunk-6DNKPBNV.mjs";
import {
  schedules_exports
} from "../../../chunk-ZD6M6VDX.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/poll-replies.ts
init_esm();
var import_client = __toESM(require_default());

// src/lib/classification/strip-html.ts
init_esm();
function stripHtml(html) {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
__name(stripHtml, "stripHtml");

// trigger/poll-replies.ts
var prisma = new import_client.PrismaClient();
var pollRepliesTask = schedules_exports.task({
  id: "poll-replies",
  cron: "*/10 * * * *",
  // every 10 minutes
  queue: emailBisonQueue,
  // concurrency limiting — prevents spike when 9 workspaces run concurrently
  maxDuration: 300,
  // 5 min — enough for all workspaces
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5e3,
    maxTimeoutInMs: 6e4
  },
  run: /* @__PURE__ */ __name(async () => {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1e3);
    const workspaces = await getAllWorkspaces();
    const activeWs = workspaces.filter((w) => w.hasApiToken);
    const wsReplies = await Promise.all(
      activeWs.map(async (ws) => {
        try {
          const config = await getWorkspaceBySlug(ws.slug);
          if (!config) return { ws, replies: [], senderEmailSet: /* @__PURE__ */ new Set() };
          const client = new EmailBisonClient(config.apiToken);
          const [replies, senderEmails] = await Promise.all([
            client.getRecentReplies(1),
            client.getSenderEmails()
          ]);
          const senderEmailSet = new Set(senderEmails.map((s) => s.email.toLowerCase()));
          return { ws, replies, senderEmailSet };
        } catch (err) {
          console.error(`[poll-replies] Failed to fetch replies for ${ws.slug}:`, err);
          return { ws, replies: [], senderEmailSet: /* @__PURE__ */ new Set(), fetchError: true };
        }
      })
    );
    const results = [];
    for (const { ws, replies, senderEmailSet, fetchError } of wsReplies) {
      const wsResult = { workspace: ws.slug, processed: 0, skipped: 0, errors: fetchError ? 1 : 0 };
      results.push(wsResult);
      const recent = replies.filter((r) => new Date(r.date_received) >= cutoff);
      for (const reply of recent) {
        try {
          const fromEmail = reply.from_email_address.toLowerCase();
          const subj = (reply.subject ?? "").toLowerCase();
          const isNonReal = reply.automated_reply || fromEmail.includes("mailer-daemon") || fromEmail.includes("postmaster") || fromEmail.includes("noreply") || fromEmail.includes("no-reply") || fromEmail.includes("@microsoft.com") || fromEmail.includes("@google.com") && (fromEmail.includes("noreply") || fromEmail.includes("no-reply")) || subj.includes("delivery status notification") || /out of office|automatic reply|auto-reply|autoreply/i.test(reply.subject ?? "") || subj.includes("connection test") || subj.includes("test email") || subj.includes("weekly digest") || subj.includes("service update") || subj.includes("retention settings");
          if (isNonReal) {
            wsResult.skipped++;
            continue;
          }
          const toEmail = (reply.primary_to_email_address ?? "").toLowerCase();
          if (toEmail && senderEmailSet.size > 0 && !senderEmailSet.has(toEmail)) {
            console.warn(
              `[poll-replies] Cross-workspace reply detected in ${ws.slug}: reply to ${toEmail} from ${fromEmail} — skipping`
            );
            wsResult.skipped++;
            continue;
          }
          const replyDate = new Date(reply.date_received);
          const windowStart = new Date(replyDate.getTime() - 5 * 60 * 1e3);
          const windowEnd = new Date(replyDate.getTime() + 5 * 60 * 1e3);
          const existing = await prisma.webhookEvent.findFirst({
            where: {
              leadEmail: { equals: reply.from_email_address, mode: "insensitive" },
              eventType: {
                in: ["LEAD_REPLIED", "LEAD_INTERESTED", "UNTRACKED_REPLY_RECEIVED", "POLLED_REPLY"]
              },
              receivedAt: { gte: windowStart, lte: windowEnd }
            }
          });
          if (existing) {
            wsResult.skipped++;
            continue;
          }
          await prisma.webhookEvent.create({
            data: {
              workspace: ws.slug,
              eventType: "POLLED_REPLY",
              campaignId: reply.campaign_id?.toString() ?? null,
              leadEmail: reply.from_email_address,
              senderEmail: reply.primary_to_email_address,
              payload: JSON.stringify({ source: "poll", reply }),
              isAutomated: false
            }
          });
          const newStatus = reply.interested ? "interested" : "replied";
          await prisma.$transaction(async (tx) => {
            await tx.person.updateMany({
              where: { email: reply.from_email_address },
              data: { status: newStatus }
            });
            await tx.personWorkspace.updateMany({
              where: {
                workspace: ws.slug,
                person: { email: reply.from_email_address }
              },
              data: { status: newStatus }
            });
          });
          let replyRecordId = null;
          if (reply.id != null) {
            try {
              const replyBodyText = reply.text_body ?? stripHtml(reply.html_body ?? "");
              let outboundSubject = null;
              let outboundBody = null;
              let outsignalCampaignId = null;
              let outsignalCampaignName = null;
              if (reply.campaign_id) {
                try {
                  const campaign = await prisma.campaign.findFirst({
                    where: { emailBisonCampaignId: reply.campaign_id },
                    select: { id: true, name: true, emailSequence: true }
                  });
                  if (campaign) {
                    outsignalCampaignId = campaign.id;
                    outsignalCampaignName = campaign.name;
                    if (campaign.emailSequence) {
                      try {
                        const steps = JSON.parse(campaign.emailSequence);
                        if (steps.length === 1) {
                          outboundSubject = steps[0].subjectLine ?? null;
                          outboundBody = steps[0].body ?? null;
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
                  where: { email: reply.from_email_address },
                  select: { id: true }
                });
                personId = person?.id ?? null;
              } catch {
              }
              const replyRecord = await prisma.reply.upsert({
                where: { emailBisonReplyId: reply.id },
                create: {
                  workspaceSlug: ws.slug,
                  senderEmail: reply.from_email_address,
                  senderName: reply.from_name,
                  subject: reply.subject,
                  bodyText: replyBodyText,
                  receivedAt: new Date(reply.date_received),
                  emailBisonReplyId: reply.id,
                  campaignId: outsignalCampaignId,
                  campaignName: outsignalCampaignName,
                  sequenceStep: null,
                  // polled replies don't have sequence_step_order
                  outboundSubject,
                  outboundBody,
                  source: "poll",
                  personId,
                  // Inbox fields
                  emailBisonParentId: reply.parent_id ?? null,
                  leadEmail: reply.from_email_address.toLowerCase(),
                  htmlBody: reply.html_body ?? null,
                  ebSenderEmailId: reply.sender_email_id ?? null,
                  interested: reply.interested ?? false,
                  direction: reply.folder === "Sent" || reply.type === "Outgoing Email" ? "outbound" : "inbound"
                },
                update: {
                  bodyText: replyBodyText,
                  subject: reply.subject,
                  senderName: reply.from_name,
                  // Backfill inbox fields
                  htmlBody: reply.html_body ?? void 0,
                  interested: reply.interested ?? void 0,
                  emailBisonParentId: reply.parent_id ?? void 0,
                  ebSenderEmailId: reply.sender_email_id ?? void 0
                }
              });
              replyRecordId = replyRecord.id;
              try {
                const classification = await classifyReply({
                  subject: replyRecord.subject,
                  bodyText: replyRecord.bodyText,
                  senderName: replyRecord.senderName,
                  outboundSubject: replyRecord.outboundSubject,
                  outboundBody: replyRecord.outboundBody
                });
                await prisma.reply.update({
                  where: { id: replyRecord.id },
                  data: {
                    intent: classification.intent,
                    sentiment: classification.sentiment,
                    objectionSubtype: classification.objectionSubtype,
                    classificationSummary: classification.summary,
                    classifiedAt: /* @__PURE__ */ new Date()
                  }
                });
              } catch (classErr) {
                console.error("[poll-replies] Classification failed, will retry:", classErr);
              }
            } catch (replyErr) {
              console.error("[poll-replies] Reply persistence error:", replyErr);
            }
          }
          await notifyReply({
            workspaceSlug: ws.slug,
            leadName: reply.from_name,
            leadEmail: reply.from_email_address,
            senderEmail: reply.primary_to_email_address,
            subject: reply.subject,
            bodyPreview: reply.text_body,
            interested: reply.interested,
            suggestedResponse: null,
            replyId: replyRecordId
          });
          try {
            const person = await prisma.person.findUnique({
              where: { email: reply.from_email_address }
            });
            if (person?.linkedinUrl) {
              const bumped = await bumpPriority(person.id, ws.slug);
              if (!bumped) {
                const existingConn = await prisma.linkedInConnection.findFirst({
                  where: { personId: person.id, sender: { workspaceSlug: ws.slug } }
                });
                if (!existingConn || existingConn.status === "none") {
                  const sender = await assignSenderForPerson(ws.slug, {
                    emailSenderAddress: reply.primary_to_email_address,
                    mode: "email_linkedin"
                  });
                  if (sender) {
                    await enqueueAction({
                      senderId: sender.id,
                      personId: person.id,
                      workspaceSlug: ws.slug,
                      actionType: "connect",
                      priority: 1,
                      scheduledFor: /* @__PURE__ */ new Date(),
                      campaignName: void 0
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.error("[poll-replies] LinkedIn fast-track error:", err);
          }
          wsResult.processed++;
        } catch (err) {
          console.error("[poll-replies] Error processing reply:", err);
          wsResult.errors++;
        }
      }
    }
    const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    console.log(
      `[poll-replies] Done: ${totalProcessed} processed, ${totalSkipped} skipped, ${totalErrors} errors across ${results.length} workspaces`
    );
    return {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      totalProcessed,
      totalSkipped,
      totalErrors,
      workspaces: results
    };
  }, "run")
});
export {
  pollRepliesTask
};
//# sourceMappingURL=poll-replies.mjs.map
