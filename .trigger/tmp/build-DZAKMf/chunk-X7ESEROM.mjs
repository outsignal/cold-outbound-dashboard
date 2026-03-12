import {
  Resend
} from "./chunk-OCSVRKXM.mjs";
import {
  postMessage
} from "./chunk-7W7UG4Z3.mjs";
import {
  prisma
} from "./chunk-6UNNRELO.mjs";
import {
  __name,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// src/lib/notifications.ts
init_esm();

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
async function notifyDeliverabilityDigest() {
  const adminBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://admin.outsignal.ai";
  const deliverabilityUrl = `${adminBaseUrl}/deliverability`;
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1e3);
  const recentDigest = await prisma.notificationAuditLog.findFirst({
    where: {
      notificationType: "deliverability_digest",
      status: "sent",
      createdAt: { gte: sixDaysAgo }
    },
    select: { id: true, createdAt: true }
  });
  if (recentDigest) {
    console.log(
      `[notifyDeliverabilityDigest] Digest already sent this week (${recentDigest.createdAt.toISOString()}) — skipping`
    );
    return;
  }
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
  const allDomains = await prisma.domainHealth.findMany({
    select: { domain: true, overallHealth: true }
  });
  const healthyDomains = allDomains.filter(
    (d) => d.overallHealth === "healthy"
  ).length;
  const atRiskDomains = allDomains.filter(
    (d) => ["warning", "critical"].includes(d.overallHealth)
  ).length;
  const worstDomain = allDomains.find((d) => d.overallHealth === "critical") ?? allDomains.find((d) => d.overallHealth === "warning") ?? null;
  const transitionCount = await prisma.emailHealthEvent.count({
    where: { createdAt: { gte: sevenDaysAgo } }
  });
  const problemSenders = await prisma.sender.findMany({
    where: {
      emailBounceStatus: { in: ["warning", "critical"] },
      emailAddress: { not: null }
    },
    select: {
      emailAddress: true,
      emailBounceStatus: true,
      workspaceSlug: true
    },
    orderBy: [{ emailBounceStatus: "asc" }, { emailAddress: "asc" }]
  });
  const workspaces = await prisma.workspace.findMany({
    select: { slug: true, name: true },
    orderBy: { name: "asc" }
  });
  const workspaceTrends = [];
  for (const ws of workspaces) {
    const recentSnapshots = await prisma.bounceSnapshot.findMany({
      where: {
        workspaceSlug: ws.slug,
        bounceRate: { not: null },
        snapshotDate: {
          gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3)
        }
      },
      select: { bounceRate: true }
    });
    const olderSnapshots = await prisma.bounceSnapshot.findMany({
      where: {
        workspaceSlug: ws.slug,
        bounceRate: { not: null },
        snapshotDate: {
          gte: sevenDaysAgo,
          lte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1e3)
        }
      },
      select: { bounceRate: true }
    });
    const avgRecent = recentSnapshots.length > 0 ? recentSnapshots.reduce((s, r) => s + (r.bounceRate ?? 0), 0) / recentSnapshots.length : null;
    const avgOlder = olderSnapshots.length > 0 ? olderSnapshots.reduce((s, r) => s + (r.bounceRate ?? 0), 0) / olderSnapshots.length : null;
    let arrow = "-";
    if (avgRecent != null && avgOlder != null) {
      arrow = avgRecent > avgOlder + 5e-3 ? "↑" : avgRecent < avgOlder - 5e-3 ? "↓" : "→";
    }
    if (avgRecent != null) {
      workspaceTrends.push({ name: ws.name, avgRate: avgRecent, arrow });
    }
  }
  const opsChannelId = process.env.OPS_SLACK_CHANNEL_ID;
  if (opsChannelId) {
    if (verifySlackChannel(opsChannelId, "admin", "notifyDeliverabilityDigest")) {
      try {
        const problemSenderLines = problemSenders.length > 0 ? problemSenders.slice(0, 10).map((s) => `• ${s.emailAddress} (${s.emailBounceStatus})`).join("\n") : null;
        const trendLines = workspaceTrends.length > 0 ? workspaceTrends.map(
          (t) => `• ${t.name}: ${t.avgRate != null ? (t.avgRate * 100).toFixed(2) + "%" : "N/A"} ${t.arrow}`
        ).join("\n") : "No bounce data available.";
        const blocks = [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: ":chart_with_upwards_trend: Weekly Deliverability Digest"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Domains:* ${healthyDomains} healthy, ${atRiskDomains} at-risk`
            }
          },
          ...worstDomain ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Worst domain:* ${worstDomain.domain} (${worstDomain.overallHealth})`
              }
            }
          ] : [],
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Transitions this week:* ${transitionCount}`
            }
          },
          ...problemSenderLines ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Problem senders:*
${problemSenderLines}`
              }
            }
          ] : [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "*Problem senders:* None"
              }
            }
          ],
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Bounce Trends by Workspace:*
${trendLines}`
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "View Deliverability Dashboard" },
                url: deliverabilityUrl
              }
            ]
          }
        ];
        await audited(
          {
            notificationType: "deliverability_digest",
            channel: "slack",
            recipient: opsChannelId
          },
          () => postMessage(
            opsChannelId,
            "Weekly Deliverability Digest",
            blocks
          )
        );
      } catch (err) {
        console.error("[notifyDeliverabilityDigest] Slack failed:", err);
      }
    }
  }
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    try {
      const verified = verifyEmailRecipients(
        [adminEmail],
        "admin",
        "notifyDeliverabilityDigest"
      );
      if (verified.length > 0) {
        const problemSenderRowsHtml = problemSenders.length > 0 ? problemSenders.slice(0, 10).map(
          (s) => `<tr>
                <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:13px;color:#18181b;">${s.emailAddress}</span>
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a1a1aa;"> &mdash; ${s.workspaceSlug}</span>
                </td>
                <td align="right" style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;color:${s.emailBounceStatus === "critical" ? "#991b1b" : "#92400e"};background-color:${s.emailBounceStatus === "critical" ? "#fef2f2" : "#fffbeb"};padding:3px 10px;border-radius:100px;white-space:nowrap;">${s.emailBounceStatus}</span>
                </td>
              </tr>`
        ).join("") : `<tr><td colspan="2" style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#71717a;">No problem senders this week.</td></tr>`;
        const trendRowsHtml = workspaceTrends.length > 0 ? workspaceTrends.map(
          (t) => `<tr>
                <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#18181b;">${t.name}</span>
                </td>
                <td align="right" style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:13px;color:#18181b;">${t.avgRate != null ? (t.avgRate * 100).toFixed(2) + "%" : "N/A"} ${t.arrow}</span>
                </td>
              </tr>`
        ).join("") : `<tr><td colspan="2" style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#71717a;">No bounce data available.</td></tr>`;
        const worstDomainHtml = worstDomain ? `              <!-- Worst domain -->
              <tr>
                <td style="padding-bottom:24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fef2f2;border-radius:8px;border:1px solid #fecaca;">
                    <tr>
                      <td style="padding:14px 18px;">
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:#991b1b;margin:0 0 4px 0;text-transform:uppercase;">Worst Domain</p>
                        <p style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:15px;color:#18181b;margin:0;font-weight:600;">${worstDomain.domain}</p>
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#991b1b;margin:4px 0 0 0;font-weight:600;">${worstDomain.overallHealth}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>` : "";
        await audited(
          {
            notificationType: "deliverability_digest",
            channel: "email",
            recipient: verified.join(",")
          },
          () => sendNotificationEmail({
            to: verified,
            subject: "[Outsignal] Weekly Deliverability Digest",
            html: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;margin:0;padding:0;">
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
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#18181b;padding-bottom:8px;line-height:1.3;">Weekly Deliverability Digest</td>
              </tr>
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#71717a;padding-bottom:24px;line-height:1.5;">Cross-workspace summary &mdash; ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</td>
              </tr>
              <!-- Domain summary -->
              <tr>
                <td style="padding-bottom:24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="50%" style="padding-right:8px;" valign="top">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="background-color:#f0fdf4;border-radius:8px;padding:16px 20px;text-align:center;">
                              <p style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;color:#16a34a;margin:0;line-height:1;">${healthyDomains}</p>
                              <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#065f46;margin:6px 0 0 0;font-weight:600;">Healthy Domains</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td width="50%" style="padding-left:8px;" valign="top">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="background-color:${atRiskDomains > 0 ? "#fef2f2" : "#f4f4f5"};border-radius:8px;padding:16px 20px;text-align:center;">
                              <p style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;color:${atRiskDomains > 0 ? "#dc2626" : "#a1a1aa"};margin:0;line-height:1;">${atRiskDomains}</p>
                              <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${atRiskDomains > 0 ? "#991b1b" : "#71717a"};margin:6px 0 0 0;font-weight:600;">At-Risk Domains</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Transitions -->
              <tr>
                <td style="padding-bottom:24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="background-color:#f0f9ff;border-radius:8px;padding:16px 20px;">
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#0c4a6e;margin:0;font-weight:600;">Transitions this week: ${transitionCount}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
${worstDomainHtml}
              <!-- Problem senders -->
              <tr>
                <td style="padding-bottom:24px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:#a1a1aa;margin:0 0 10px 0;text-transform:uppercase;">Problem Senders</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    ${problemSenderRowsHtml}
                  </table>
                </td>
              </tr>
              <!-- Bounce trends -->
              <tr>
                <td style="padding-bottom:24px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:#a1a1aa;margin:0 0 10px 0;text-transform:uppercase;">Bounce Trends by Workspace</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    ${trendRowsHtml}
                  </table>
                </td>
              </tr>
              <!-- CTA button -->
              <tr>
                <td style="padding-top:8px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background-color:#F0FF7A;border-radius:8px;">
                        <a href="${deliverabilityUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#18181b;text-decoration:none;">View Deliverability Dashboard</a>
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
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a1a1aa;margin:0;line-height:1.5;">Outsignal &mdash; Weekly deliverability digest.<br/>You received this because you are the system administrator.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
          })
        );
      }
    } catch (err) {
      console.error("[notifyDeliverabilityDigest] Email failed:", err);
    }
  }
}
__name(notifyDeliverabilityDigest, "notifyDeliverabilityDigest");
async function notifyWeeklyDigest(params) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: params.workspaceSlug }
  });
  if (!workspace) return;
  const adminBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://admin.outsignal.ai";
  const insightsUrl = `${adminBaseUrl}/intelligence`;
  const categoryEmoji = {
    performance: "chart_with_upwards_trend",
    copy: "memo",
    objections: "speech_balloon",
    icp: "dart"
  };
  const kpiParts = [];
  if (params.replyCount != null) kpiParts.push(`${params.replyCount} replies`);
  if (params.avgReplyRate != null) kpiParts.push(`${params.avgReplyRate.toFixed(1)}% avg reply rate`);
  if (params.insightCount != null) kpiParts.push(`${params.insightCount} insights pending`);
  const kpiLine = kpiParts.length > 0 ? kpiParts.join(" | ") : null;
  const clientChannelId = workspace.slackChannelId;
  const opsChannelId = process.env.OPS_SLACK_CHANNEL_ID;
  const slackChannelId = clientChannelId ?? opsChannelId;
  const slackIntent = clientChannelId ? "client" : "admin";
  if (slackChannelId) {
    if (verifySlackChannel(
      slackChannelId,
      slackIntent,
      "notifyWeeklyDigest"
    )) {
      try {
        const insightLines = params.topInsights.map((i) => {
          const emoji = categoryEmoji[i.category] ?? "bulb";
          return `:${emoji}: [${i.category.toUpperCase()}] ${i.observation} _(${i.confidence} confidence)_`;
        }).join("\n");
        const campaignSection = [];
        if (params.bestCampaign) {
          campaignSection.push(
            `:trophy: *Best:* ${params.bestCampaign.name} (${params.bestCampaign.replyRate}% reply rate)`
          );
        }
        if (params.worstCampaign) {
          campaignSection.push(
            `:warning: *Needs attention:* ${params.worstCampaign.name} (${params.worstCampaign.replyRate}% reply rate)`
          );
        }
        const blocks = [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `[${workspace.name}] Weekly Intelligence Digest`
            }
          },
          ...kpiLine ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*This week:* ${kpiLine}`
              }
            }
          ] : [],
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Top Insights*
${insightLines || "No new insights this week."}`
            }
          },
          ...campaignSection.length > 0 ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: campaignSection.join("\n")
              }
            }
          ] : [],
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${params.pendingActions}* pending action${params.pendingActions !== 1 ? "s" : ""} awaiting review`
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "View Insights" },
                url: insightsUrl
              }
            ]
          }
        ];
        await audited(
          {
            notificationType: "weekly_digest",
            channel: "slack",
            recipient: slackChannelId,
            workspaceSlug: params.workspaceSlug
          },
          () => postMessage(
            slackChannelId,
            `[${workspace.name}] Weekly Intelligence Digest`,
            blocks
          )
        );
      } catch (err) {
        console.error("[notifyWeeklyDigest] Slack failed:", err);
      }
    }
  }
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    try {
      const verified = verifyEmailRecipients(
        [adminEmail],
        "admin",
        "notifyWeeklyDigest"
      );
      if (verified.length > 0) {
        const subject = `[${workspace.name}] Weekly Intelligence Digest`;
        const insightRowsHtml = params.topInsights.map(
          (i) => `<tr>
                <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.5px;color:#a1a1aa;text-transform:uppercase;">${i.category}</span>
                  <br/>
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#18181b;line-height:1.5;">${i.observation}</span>
                  <br/>
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#71717a;">${i.confidence} confidence</span>
                </td>
              </tr>`
        ).join("");
        let campaignHtml = "";
        if (params.bestCampaign || params.worstCampaign) {
          const cells = [];
          if (params.bestCampaign) {
            cells.push(`
              <td width="50%" style="padding-right:8px;" valign="top">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="background-color:#f0fdf4;border-radius:8px;padding:16px 20px;">
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:#065f46;margin:0 0 4px 0;text-transform:uppercase;">Best Campaign</p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#18181b;margin:0;font-weight:600;">${params.bestCampaign.name}</p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#16a34a;margin:6px 0 0 0;">${params.bestCampaign.replyRate}%</p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#065f46;margin:2px 0 0 0;">Reply rate</p>
                    </td>
                  </tr>
                </table>
              </td>`);
          }
          if (params.worstCampaign) {
            cells.push(`
              <td width="50%" style="padding-left:8px;" valign="top">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="background-color:#fef2f2;border-radius:8px;padding:16px 20px;">
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:#991b1b;margin:0 0 4px 0;text-transform:uppercase;">Needs Attention</p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#18181b;margin:0;font-weight:600;">${params.worstCampaign.name}</p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#dc2626;margin:6px 0 0 0;">${params.worstCampaign.replyRate}%</p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#991b1b;margin:2px 0 0 0;">Reply rate</p>
                    </td>
                  </tr>
                </table>
              </td>`);
          }
          campaignHtml = `
              <tr>
                <td style="padding-bottom:24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>${cells.join("")}</tr>
                  </table>
                </td>
              </tr>`;
        }
        await audited(
          {
            notificationType: "weekly_digest",
            channel: "email",
            recipient: verified.join(","),
            workspaceSlug: params.workspaceSlug
          },
          () => sendNotificationEmail({
            to: verified,
            subject,
            html: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;margin:0;padding:0;">
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
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#18181b;padding-bottom:8px;line-height:1.3;">Weekly Intelligence Digest</td>
              </tr>
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#71717a;padding-bottom:24px;line-height:1.5;">${workspace.name}</td>
              </tr>
${kpiLine ? `              <!-- KPI Summary -->
              <tr>
                <td style="padding-bottom:24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="background-color:#f0f9ff;border-radius:8px;padding:16px 20px;">
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#0c4a6e;margin:0;font-weight:600;">This week: ${kpiLine}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>` : ""}
${campaignHtml}
              <!-- Insights list -->
              <tr>
                <td style="padding-bottom:24px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:#a1a1aa;margin:0 0 10px 0;text-transform:uppercase;">Top Insights</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    ${insightRowsHtml || '<tr><td style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#71717a;">No new insights this week.</td></tr>'}
                  </table>
                </td>
              </tr>
              <!-- Pending actions -->
              <tr>
                <td style="padding-bottom:24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="background-color:#fffbeb;border-radius:8px;padding:16px 20px;">
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;color:#d97706;margin:0;line-height:1;">${params.pendingActions}</p>
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#92400e;margin:6px 0 0 0;font-weight:600;">Pending Actions</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- CTA button -->
              <tr>
                <td style="padding-top:8px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background-color:#F0FF7A;border-radius:8px;">
                        <a href="${insightsUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#18181b;text-decoration:none;">View Insights</a>
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
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a1a1aa;margin:0;line-height:1.5;">Outsignal &mdash; Weekly intelligence digest for ${workspace.name}.<br/>You received this because you are an admin.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
          })
        );
      }
    } catch (err) {
      console.error("[notifyWeeklyDigest] Email failed:", err);
    }
  }
}
__name(notifyWeeklyDigest, "notifyWeeklyDigest");

export {
  notifyReply,
  notifyDeliverabilityDigest,
  notifyWeeklyDigest
};
//# sourceMappingURL=chunk-X7ESEROM.mjs.map
