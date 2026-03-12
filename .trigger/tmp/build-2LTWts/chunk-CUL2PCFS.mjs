import {
  Resend
} from "./chunk-OCSVRKXM.mjs";
import {
  postMessage
} from "./chunk-ADKV6LO6.mjs";
import {
  prisma
} from "./chunk-6UNNRELO.mjs";
import {
  __name,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

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

// src/lib/notification-audit.ts
init_esm();
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

// src/lib/resend.ts
init_esm();
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

export {
  verifyEmailRecipients,
  verifySlackChannel,
  notify,
  audited,
  sendNotificationEmail
};
//# sourceMappingURL=chunk-CUL2PCFS.mjs.map
