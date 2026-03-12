import {
  checkBlacklists
} from "../../../chunk-B72UYMWX.mjs";
import {
  captureAllWorkspaces
} from "../../../chunk-VCAHU2YN.mjs";
import "../../../chunk-HYVNS55X.mjs";
import {
  audited,
  sendNotificationEmail,
  verifyEmailRecipients,
  verifySlackChannel
} from "../../../chunk-CUL2PCFS.mjs";
import "../../../chunk-OCSVRKXM.mjs";
import {
  postMessage
} from "../../../chunk-ADKV6LO6.mjs";
import "../../../chunk-I7EJTL45.mjs";
import "../../../chunk-I775ELQ2.mjs";
import "../../../chunk-6UNNRELO.mjs";
import {
  require_default
} from "../../../chunk-6DNKPBNV.mjs";
import {
  schedules_exports
} from "../../../chunk-LNHUL6B5.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/domain-health.ts
init_esm();
var import_client = __toESM(require_default());

// src/lib/domain-health/dns.ts
init_esm();
import { Resolver } from "dns/promises";

// src/lib/domain-health/types.ts
init_esm();
var DKIM_SELECTORS = ["google", "default", "selector1", "selector2"];

// src/lib/domain-health/dns.ts
var DNS_TIMEOUT_MS = 5e3;
var LOG_PREFIX = "[domain-health]";
function createResolver() {
  const resolver = new Resolver({ timeout: DNS_TIMEOUT_MS });
  return resolver;
}
__name(createResolver, "createResolver");
async function checkSpf(domain) {
  const resolver = createResolver();
  try {
    const records = await resolver.resolveTxt(domain);
    const txtValues = records.map((chunks) => chunks.join(""));
    const spfRecord = txtValues.find(
      (txt) => txt.toLowerCase().startsWith("v=spf1")
    );
    if (!spfRecord) {
      return { status: "missing", record: null };
    }
    const hasValidMechanism = /\b(include|ip4|ip6|a|mx|ptr|exists|redirect|all)\b/i.test(spfRecord);
    if (!hasValidMechanism) {
      return { status: "fail", record: spfRecord };
    }
    return { status: "pass", record: spfRecord };
  } catch (err) {
    const code = err.code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ESERVFAIL") {
      return { status: "missing", record: null };
    }
    console.error(
      `${LOG_PREFIX} SPF lookup failed for ${domain}:`,
      err.message
    );
    return { status: "missing", record: null };
  }
}
__name(checkSpf, "checkSpf");
async function checkDkim(domain) {
  const resolver = createResolver();
  const checks = await Promise.allSettled(
    DKIM_SELECTORS.map(async (selector) => {
      const dkimHost = `${selector}._domainkey.${domain}`;
      try {
        const records = await resolver.resolveTxt(dkimHost);
        const txtValues = records.map((chunks) => chunks.join(""));
        const hasDkim = txtValues.some(
          (txt) => txt.toLowerCase().includes("v=dkim1")
        );
        return hasDkim ? selector : null;
      } catch (err) {
        const code = err.code;
        if (code === "ENOTFOUND" || code === "ENODATA" || code === "ESERVFAIL") {
          return null;
        }
        console.error(
          `${LOG_PREFIX} DKIM lookup failed for ${dkimHost}:`,
          err.message
        );
        return null;
      }
    })
  );
  const passedSelectors = checks.filter(
    (r) => r.status === "fulfilled" && r.value !== null
  ).map((r) => r.value);
  if (passedSelectors.length === 0) {
    return { status: "missing", passedSelectors: [] };
  }
  if (passedSelectors.length === DKIM_SELECTORS.length) {
    return { status: "pass", passedSelectors };
  }
  return { status: "partial", passedSelectors };
}
__name(checkDkim, "checkDkim");
async function checkDmarc(domain) {
  const resolver = createResolver();
  const dmarcHost = `_dmarc.${domain}`;
  try {
    const records = await resolver.resolveTxt(dmarcHost);
    const txtValues = records.map((chunks) => chunks.join(""));
    const dmarcRecord = txtValues.find(
      (txt) => txt.toLowerCase().startsWith("v=dmarc1")
    );
    if (!dmarcRecord) {
      return { status: "missing", policy: null, record: null, aspf: null, adkim: null };
    }
    const policyMatch = dmarcRecord.match(/\bp=(\w+)/i);
    if (!policyMatch) {
      return { status: "fail", policy: null, record: dmarcRecord, aspf: null, adkim: null };
    }
    const policyValue = policyMatch[1].toLowerCase();
    if (policyValue !== "none" && policyValue !== "quarantine" && policyValue !== "reject") {
      return { status: "fail", policy: null, record: dmarcRecord, aspf: null, adkim: null };
    }
    const aspfMatch = dmarcRecord.match(/\baspf=([rs])/i);
    const adkimMatch = dmarcRecord.match(/\badkim=([rs])/i);
    const aspf = aspfMatch ? aspfMatch[1].toLowerCase() : null;
    const adkim = adkimMatch ? adkimMatch[1].toLowerCase() : null;
    return {
      status: "pass",
      policy: policyValue,
      record: dmarcRecord,
      aspf,
      adkim
    };
  } catch (err) {
    const code = err.code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ESERVFAIL") {
      return { status: "missing", policy: null, record: null, aspf: null, adkim: null };
    }
    console.error(
      `${LOG_PREFIX} DMARC lookup failed for ${domain}:`,
      err.message
    );
    return { status: "missing", policy: null, record: null, aspf: null, adkim: null };
  }
}
__name(checkDmarc, "checkDmarc");
async function checkMx(domain) {
  const resolver = createResolver();
  try {
    const records = await resolver.resolveMx(domain);
    const hosts = records.sort((a, b) => a.priority - b.priority).map((r) => r.exchange);
    if (hosts.length === 0) {
      return { status: "missing", hosts: [] };
    }
    return { status: "pass", hosts };
  } catch (err) {
    const code = err.code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ESERVFAIL") {
      return { status: "missing", hosts: [] };
    }
    console.error(
      `${LOG_PREFIX} MX lookup failed for ${domain}:`,
      err.message
    );
    return { status: "missing", hosts: [] };
  }
}
__name(checkMx, "checkMx");
async function checkMtaSts(domain) {
  const resolver = createResolver();
  const mtaStsHost = `_mta-sts.${domain}`;
  try {
    const records = await resolver.resolveTxt(mtaStsHost);
    const txtValues = records.map((chunks) => chunks.join(""));
    const stsRecord = txtValues.find(
      (txt) => txt.toLowerCase().startsWith("v=stsv1")
    );
    if (!stsRecord) {
      return { status: "missing", id: null };
    }
    const idMatch = stsRecord.match(/\bid=(\S+)/i);
    return { status: "pass", id: idMatch ? idMatch[1] : null };
  } catch (err) {
    const code = err.code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ESERVFAIL") {
      return { status: "missing", id: null };
    }
    console.error(
      `${LOG_PREFIX} MTA-STS lookup failed for ${domain}:`,
      err.message
    );
    return { status: "missing", id: null };
  }
}
__name(checkMtaSts, "checkMtaSts");
async function checkTlsRpt(domain) {
  const resolver = createResolver();
  const tlsRptHost = `_smtp._tls.${domain}`;
  try {
    const records = await resolver.resolveTxt(tlsRptHost);
    const txtValues = records.map((chunks) => chunks.join(""));
    const rptRecord = txtValues.find(
      (txt) => txt.toLowerCase().startsWith("v=tlsrptv1")
    );
    if (!rptRecord) {
      return { status: "missing", rua: null };
    }
    const ruaMatch = rptRecord.match(/\brua=(\S+)/i);
    return { status: "pass", rua: ruaMatch ? ruaMatch[1] : null };
  } catch (err) {
    const code = err.code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ESERVFAIL") {
      return { status: "missing", rua: null };
    }
    console.error(
      `${LOG_PREFIX} TLS-RPT lookup failed for ${domain}:`,
      err.message
    );
    return { status: "missing", rua: null };
  }
}
__name(checkTlsRpt, "checkTlsRpt");
async function checkBimi(domain) {
  const resolver = createResolver();
  const bimiHost = `default._bimi.${domain}`;
  try {
    const records = await resolver.resolveTxt(bimiHost);
    const txtValues = records.map((chunks) => chunks.join(""));
    const bimiRecord = txtValues.find(
      (txt) => txt.toLowerCase().startsWith("v=bimi1")
    );
    if (!bimiRecord) {
      return { status: "missing", logoUrl: null, vmcUrl: null };
    }
    const logoMatch = bimiRecord.match(/\bl=(\S+)/i);
    const vmcMatch = bimiRecord.match(/\ba=(\S+)/i);
    return {
      status: "pass",
      logoUrl: logoMatch ? logoMatch[1] : null,
      vmcUrl: vmcMatch ? vmcMatch[1] : null
    };
  } catch (err) {
    const code = err.code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ESERVFAIL") {
      return { status: "missing", logoUrl: null, vmcUrl: null };
    }
    console.error(
      `${LOG_PREFIX} BIMI lookup failed for ${domain}:`,
      err.message
    );
    return { status: "missing", logoUrl: null, vmcUrl: null };
  }
}
__name(checkBimi, "checkBimi");
async function checkAllDns(domain) {
  const [spf, dkim, dmarc, mx, mtaSts, tlsRpt, bimi] = await Promise.all([
    checkSpf(domain),
    checkDkim(domain),
    checkDmarc(domain),
    checkMx(domain),
    checkMtaSts(domain),
    checkTlsRpt(domain),
    checkBimi(domain)
  ]);
  return { spf, dkim, dmarc, mx, mtaSts, tlsRpt, bimi };
}
__name(checkAllDns, "checkAllDns");
function computeOverallHealth(dns, blacklistHits, blacklistSeverity) {
  const { spf, dkim, dmarc } = dns;
  if (blacklistHits.length > 0 && blacklistSeverity === "critical") return "critical";
  if (spf.status === "fail") return "critical";
  if (dmarc.status === "fail") return "critical";
  if (blacklistHits.length > 0 && blacklistSeverity === "warning") return "warning";
  if (spf.status === "missing") return "warning";
  if (dmarc.status === "missing") return "warning";
  if (dmarc.policy === "none") return "warning";
  if (dkim.status === "partial") return "warning";
  if (dkim.status === "missing") return "warning";
  if (dns.mx.status === "missing") return "warning";
  if (spf.status === "pass" && dkim.status === "pass" && dmarc.status === "pass" && dns.mx.status === "pass" && (dmarc.policy === "quarantine" || dmarc.policy === "reject")) {
    return "healthy";
  }
  return "unknown";
}
__name(computeOverallHealth, "computeOverallHealth");

// src/lib/domain-health/notifications.ts
init_esm();
var LOG_PREFIX2 = "[domain-health/notifications]";
function getAdminEmail() {
  return process.env.ADMIN_EMAIL ?? null;
}
__name(getAdminEmail, "getAdminEmail");
function getAlertsChannelId() {
  return process.env.ALERTS_SLACK_CHANNEL_ID ?? null;
}
__name(getAlertsChannelId, "getAlertsChannelId");
function tierBadge(tier) {
  return tier === "critical" ? ":red_circle: *CRITICAL*" : ":warning: WARNING";
}
__name(tierBadge, "tierBadge");
async function notifyBlacklistHit(params) {
  const { domain, hits, skipEmail } = params;
  const hasCritical = hits.some((h) => h.tier === "critical");
  const severityEmoji = hasCritical ? ":rotating_light:" : ":warning:";
  const headerText = `${severityEmoji} Domain Blacklisted: ${domain}`;
  const alertsChannelId = getAlertsChannelId();
  if (alertsChannelId) {
    if (verifySlackChannel(alertsChannelId, "admin", "notifyBlacklistHit")) {
      const hitLines = hits.map((h) => {
        const badge = tierBadge(h.tier);
        const delist = h.delistUrl ? ` — <${h.delistUrl}|Request Removal>` : "";
        return `• ${badge}: ${h.list}${delist}`;
      }).join("\n");
      const blocks = [
        {
          type: "header",
          text: { type: "plain_text", text: `Domain Blacklisted: ${domain}` }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Domain:* \`${domain}\`
*Listed on ${hits.length} DNSBL${hits.length !== 1 ? "s" : ""}:*
${hitLines}`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Deliverability is at risk. Delist as soon as possible.`
            }
          ]
        }
      ];
      try {
        await audited(
          {
            notificationType: "domain_blacklisted",
            channel: "slack",
            recipient: alertsChannelId,
            metadata: { domain, hits: hits.length, hasCritical }
          },
          () => postMessage(alertsChannelId, headerText, blocks)
        );
      } catch (err) {
        console.error(`${LOG_PREFIX2} Failed to send blacklist Slack alert for ${domain}:`, err);
      }
    }
  }
  if (!skipEmail) {
    const adminEmail = getAdminEmail();
    if (adminEmail) {
      const verified = verifyEmailRecipients([adminEmail], "admin", "notifyBlacklistHit");
      if (verified.length > 0) {
        const hitRowsHtml = hits.map((h) => {
          const color = h.tier === "critical" ? "#dc2626" : "#d97706";
          const label = h.tier === "critical" ? "CRITICAL" : "WARNING";
          const delistLink = h.delistUrl ? ` &mdash; <a href="${h.delistUrl}" style="color:#F0FF7A;">Request Removal</a>` : "";
          return `<tr>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;">
                <span style="display:inline-block;background-color:${color};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-right:8px;">${label}</span>
                ${h.list}${delistLink}
              </td>
            </tr>`;
        }).join("");
        const html = buildEmailHtml({
          title: `Domain Blacklisted: ${domain}`,
          bodyContent: `
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3f3f46;margin:0 0 16px 0;">
              The domain <strong>${domain}</strong> has been detected on ${hits.length} DNSBL${hits.length !== 1 ? "s" : ""}.
              This may impact email deliverability for all senders on this domain.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${hitRowsHtml}
            </table>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#71717a;margin:16px 0 0 0;">
              Use the removal links above to request delisting. Critical listings should be resolved within 24 hours.
            </p>`
        });
        try {
          await audited(
            {
              notificationType: "domain_blacklisted",
              channel: "email",
              recipient: verified.join(","),
              metadata: { domain, hits: hits.length, hasCritical }
            },
            () => sendNotificationEmail({
              to: verified,
              subject: `[Outsignal] Domain Blacklisted: ${domain} (${hits.length} listing${hits.length !== 1 ? "s" : ""})`,
              html
            })
          );
        } catch (err) {
          console.error(`${LOG_PREFIX2} Failed to send blacklist email alert for ${domain}:`, err);
        }
      }
    }
  }
}
__name(notifyBlacklistHit, "notifyBlacklistHit");
async function notifyBlacklistDelisted(params) {
  const { domain, delistedFrom } = params;
  const headerText = `:white_check_mark: Domain Delisted: ${domain}`;
  const alertsChannelId = getAlertsChannelId();
  if (!alertsChannelId) return;
  if (!verifySlackChannel(alertsChannelId, "admin", "notifyBlacklistDelisted")) return;
  const listNames = delistedFrom.map((l) => `• ${l}`).join("\n");
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `✅ Domain Delisted: ${domain}`, emoji: true }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Domain:* \`${domain}\`
*Removed from ${delistedFrom.length} DNSBL${delistedFrom.length !== 1 ? "s" : ""}:*
${listNames}`
      }
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: ":white_check_mark: Deliverability should be restored. Monitor bounce rates over the next 24 hours."
        }
      ]
    }
  ];
  try {
    await audited(
      {
        notificationType: "domain_delisted",
        channel: "slack",
        recipient: alertsChannelId,
        metadata: { domain, count: delistedFrom.length }
      },
      () => postMessage(alertsChannelId, headerText, blocks)
    );
  } catch (err) {
    console.error(`${LOG_PREFIX2} Failed to send delist Slack notification for ${domain}:`, err);
  }
}
__name(notifyBlacklistDelisted, "notifyBlacklistDelisted");
async function notifyDnsFailure(params) {
  const { domain, failures, persistent, skipEmail } = params;
  const severity = persistent ? "critical" : "warning";
  const severityLabel = persistent ? "CRITICAL" : "Warning";
  const emoji = persistent ? ":rotating_light:" : ":warning:";
  const headerText = `${emoji} DNS ${severityLabel}: ${domain}`;
  const checkLabels = {
    spf: "SPF",
    dkim: "DKIM",
    dmarc: "DMARC",
    mx: "MX"
  };
  const failureLines = failures.map((f) => `• ${checkLabels[f.check] ?? f.check}: \`${f.status}\``).join("\n");
  const escalationNote = persistent ? "\n\n:rotating_light: *This issue has been persisting for 48+ hours. Immediate action required.*" : "";
  const alertsChannelId = getAlertsChannelId();
  if (alertsChannelId) {
    if (verifySlackChannel(alertsChannelId, "admin", "notifyDnsFailure")) {
      const blocks = [
        {
          type: "header",
          text: { type: "plain_text", text: `DNS ${severityLabel}: ${domain}` }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Domain:* \`${domain}\`
*Failed checks:*
${failureLines}${escalationNote}`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: persistent ? "DNS misconfiguration has been present for 48+ hours. Deliverability impact is likely." : "DNS validation failed. Check records and allow up to 24 hours for propagation."
            }
          ]
        }
      ];
      try {
        await audited(
          {
            notificationType: "domain_dns_failure",
            channel: "slack",
            recipient: alertsChannelId,
            metadata: { domain, severity, checks: failures.map((f) => f.check), persistent }
          },
          () => postMessage(alertsChannelId, headerText, blocks)
        );
      } catch (err) {
        console.error(`${LOG_PREFIX2} Failed to send DNS failure Slack alert for ${domain}:`, err);
      }
    }
  }
  if (!skipEmail) {
    const adminEmail = getAdminEmail();
    if (adminEmail) {
      const verified = verifyEmailRecipients([adminEmail], "admin", "notifyDnsFailure");
      if (verified.length > 0) {
        const failureRowsHtml = failures.map(
          (f) => `<tr>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;">
                <strong>${checkLabels[f.check] ?? f.check}:</strong> <code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;">${f.status}</code>
              </td>
            </tr>`
        ).join("");
        const escalationHtml = persistent ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#dc2626;font-weight:700;margin:16px 0 0 0;">
              This DNS misconfiguration has been present for over 48 hours. Immediate action required.
             </p>` : "";
        const html = buildEmailHtml({
          title: `DNS ${severityLabel}: ${domain}`,
          bodyContent: `
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3f3f46;margin:0 0 16px 0;">
              DNS validation failed for <strong>${domain}</strong>. The following checks did not pass:
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${failureRowsHtml}
            </table>
            ${escalationHtml}
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#71717a;margin:16px 0 0 0;">
              DNS changes may take up to 24 hours to propagate. Verify records using a DNS lookup tool.
            </p>`
        });
        try {
          await audited(
            {
              notificationType: "domain_dns_failure",
              channel: "email",
              recipient: verified.join(","),
              metadata: { domain, severity, checks: failures.map((f) => f.check), persistent }
            },
            () => sendNotificationEmail({
              to: verified,
              subject: `[Outsignal] DNS ${severityLabel}: ${domain} — ${failures.map((f) => checkLabels[f.check] ?? f.check).join(", ")} failed`,
              html
            })
          );
        } catch (err) {
          console.error(`${LOG_PREFIX2} Failed to send DNS failure email alert for ${domain}:`, err);
        }
      }
    }
  }
}
__name(notifyDnsFailure, "notifyDnsFailure");
async function sendBlacklistDigestEmail(items) {
  if (items.length === 0) return;
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;
  const verified = verifyEmailRecipients([adminEmail], "admin", "sendBlacklistDigestEmail");
  if (verified.length === 0) return;
  const totalHits = items.reduce((sum, item) => sum + item.hits.length, 0);
  const hasCritical = items.some((item) => item.hits.some((h) => h.tier === "critical"));
  const domainSectionsHtml = items.map((item) => {
    const hitRowsHtml = item.hits.map((h) => {
      const color = h.tier === "critical" ? "#dc2626" : "#d97706";
      const label = h.tier === "critical" ? "CRITICAL" : "WARNING";
      const delistLink = h.delistUrl ? ` &mdash; <a href="${h.delistUrl}" style="color:#F0FF7A;">Request Removal</a>` : "";
      return `<tr>
            <td style="padding:4px 0 4px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;">
              <span style="display:inline-block;background-color:${color};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-right:8px;">${label}</span>
              ${h.list}${delistLink}
            </td>
          </tr>`;
    }).join("");
    return `
        <tr>
          <td style="padding:16px 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#18181b;border-top:1px solid #e4e4e7;">
            ${item.domain} &mdash; ${item.hits.length} listing${item.hits.length !== 1 ? "s" : ""}
          </td>
        </tr>
        ${hitRowsHtml}`;
  }).join("");
  const html = buildEmailHtml({
    title: `Blacklist Alert: ${items.length} Domain${items.length !== 1 ? "s" : ""} Listed`,
    bodyContent: `
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3f3f46;margin:0 0 16px 0;">
        ${items.length} domain${items.length !== 1 ? "s have" : " has"} been detected on DNSBLs (${totalHits} total listing${totalHits !== 1 ? "s" : ""}).
        This may impact email deliverability.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${domainSectionsHtml}
      </table>
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#71717a;margin:16px 0 0 0;">
        Use the removal links above to request delisting. Critical listings should be resolved within 24 hours.
      </p>`
  });
  try {
    await audited(
      {
        notificationType: "domain_blacklisted_digest",
        channel: "email",
        recipient: verified.join(","),
        metadata: { domains: items.length, totalHits, hasCritical }
      },
      () => sendNotificationEmail({
        to: verified,
        subject: `[Outsignal] Blacklist Alert: ${items.length} domain${items.length !== 1 ? "s" : ""}, ${totalHits} listing${totalHits !== 1 ? "s" : ""}`,
        html
      })
    );
  } catch (err) {
    console.error(`${LOG_PREFIX2} Failed to send blacklist digest email:`, err);
  }
}
__name(sendBlacklistDigestEmail, "sendBlacklistDigestEmail");
async function sendDnsFailureDigestEmail(items) {
  if (items.length === 0) return;
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;
  const verified = verifyEmailRecipients([adminEmail], "admin", "sendDnsFailureDigestEmail");
  if (verified.length === 0) return;
  const hasPersistent = items.some((item) => item.persistent);
  const severityLabel = hasPersistent ? "CRITICAL" : "Warning";
  const checkLabels = {
    spf: "SPF",
    dkim: "DKIM",
    dmarc: "DMARC",
    mx: "MX"
  };
  const domainSectionsHtml = items.map((item) => {
    const persistentBadge = item.persistent ? ` <span style="display:inline-block;background-color:#dc2626;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:8px;">48h+ PERSISTENT</span>` : "";
    const failureRowsHtml = item.failures.map(
      (f) => `<tr>
            <td style="padding:4px 0 4px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;">
              <strong>${checkLabels[f.check] ?? f.check}:</strong> <code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;">${f.status}</code>
            </td>
          </tr>`
    ).join("");
    return `
        <tr>
          <td style="padding:16px 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#18181b;border-top:1px solid #e4e4e7;">
            ${item.domain}${persistentBadge}
          </td>
        </tr>
        ${failureRowsHtml}`;
  }).join("");
  const escalationHtml = hasPersistent ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#dc2626;font-weight:700;margin:16px 0 0 0;">
        One or more domains have had DNS misconfigurations for over 48 hours. Immediate action required.
       </p>` : "";
  const html = buildEmailHtml({
    title: `DNS ${severityLabel}: ${items.length} Domain${items.length !== 1 ? "s" : ""} Failing`,
    bodyContent: `
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3f3f46;margin:0 0 16px 0;">
        DNS validation failed for ${items.length} domain${items.length !== 1 ? "s" : ""}. The following checks did not pass:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${domainSectionsHtml}
      </table>
      ${escalationHtml}
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#71717a;margin:16px 0 0 0;">
        DNS changes may take up to 24 hours to propagate. Verify records using a DNS lookup tool.
      </p>`
  });
  try {
    await audited(
      {
        notificationType: "domain_dns_failure_digest",
        channel: "email",
        recipient: verified.join(","),
        metadata: {
          domains: items.length,
          hasPersistent,
          checks: items.flatMap((i) => i.failures.map((f) => f.check))
        }
      },
      () => sendNotificationEmail({
        to: verified,
        subject: `[Outsignal] DNS ${severityLabel}: ${items.length} domain${items.length !== 1 ? "s" : ""} failing validation`,
        html
      })
    );
  } catch (err) {
    console.error(`${LOG_PREFIX2} Failed to send DNS failure digest email:`, err);
  }
}
__name(sendDnsFailureDigestEmail, "sendDnsFailureDigestEmail");
function buildEmailHtml(params) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;margin:0;padding:0;">
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
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#18181b;padding-bottom:24px;line-height:1.3;">${params.title}</td>
              </tr>
              <tr>
                <td>${params.bodyContent}</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#fafafa;padding:20px 32px;border-top:1px solid #e4e4e7;border-radius:0 0 8px 8px;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a1a1aa;margin:0;line-height:1.5;">Outsignal Admin &mdash; Domain health monitoring alert.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}
__name(buildEmailHtml, "buildEmailHtml");

// trigger/domain-health.ts
var prisma = new import_client.PrismaClient();
var BOUNCE_RATE_THRESHOLD = 0.03;
var BLACKLIST_CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1e3;
var DNS_ESCALATION_THRESHOLD_MS = 48 * 60 * 60 * 1e3;
var LOG_PREFIX3 = "[domain-health-cron]";
async function collectSendingDomains() {
  const senders = await prisma.sender.findMany({
    where: { emailAddress: { not: null } },
    select: { emailAddress: true }
  });
  const domains = /* @__PURE__ */ new Set();
  for (const sender of senders) {
    if (sender.emailAddress) {
      const parts = sender.emailAddress.split("@");
      const domain = parts[1]?.toLowerCase();
      if (domain) domains.add(domain);
    }
  }
  return Array.from(domains);
}
__name(collectSendingDomains, "collectSendingDomains");
async function buildPriorityQueue(domains) {
  const now = /* @__PURE__ */ new Date();
  const domainHealthRecords = await prisma.domainHealth.findMany({
    where: { domain: { in: domains } },
    select: {
      domain: true,
      lastDnsCheck: true,
      lastBlacklistCheck: true,
      blacklistHits: true,
      blacklistSeverity: true,
      spfStatus: true,
      dkimStatus: true,
      dmarcStatus: true,
      overallHealth: true,
      updatedAt: true
    }
  });
  const healthByDomain = new Map(domainHealthRecords.map((r) => [r.domain, r]));
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1e3);
  const recentSnapshots = await prisma.bounceSnapshot.findMany({
    where: {
      snapshotDate: { gte: threeDaysAgo },
      bounceRate: { not: null }
    },
    select: { senderDomain: true, bounceRate: true },
    orderBy: { bounceRate: "desc" }
  });
  const maxBounceByDomain = /* @__PURE__ */ new Map();
  for (const snap of recentSnapshots) {
    if (snap.bounceRate !== null) {
      const current = maxBounceByDomain.get(snap.senderDomain) ?? 0;
      if (snap.bounceRate > current) {
        maxBounceByDomain.set(snap.senderDomain, snap.bounceRate);
      }
    }
  }
  const priorities = domains.map((domain) => {
    const health = healthByDomain.get(domain);
    const maxBounceRate = maxBounceByDomain.get(domain) ?? null;
    let previousBlacklistHits = [];
    if (health?.blacklistHits) {
      try {
        previousBlacklistHits = JSON.parse(health.blacklistHits);
      } catch {
        previousBlacklistHits = [];
      }
    }
    let firstFailingSince = null;
    if (health) {
      const isDnsFailing = health.spfStatus === "fail" || health.spfStatus === "missing" || health.dkimStatus === "fail" || health.dkimStatus === "missing" || health.dmarcStatus === "fail" || health.dmarcStatus === "missing";
      if (isDnsFailing && health.updatedAt) {
        firstFailingSince = health.updatedAt;
      }
    }
    return {
      domain,
      maxBounceRate,
      lastDnsCheck: health?.lastDnsCheck ?? null,
      lastBlacklistCheck: health?.lastBlacklistCheck ?? null,
      previousBlacklistHits,
      firstFailingSince,
      overallHealth: health?.overallHealth ?? null,
      previousBlacklistSeverity: health?.blacklistSeverity ?? "none"
    };
  });
  priorities.sort((a, b) => {
    const aCritical = a.overallHealth === "critical" ? 1 : 0;
    const bCritical = b.overallHealth === "critical" ? 1 : 0;
    if (bCritical !== aCritical) return bCritical - aCritical;
    const aBounce = a.maxBounceRate ?? 0;
    const bBounce = b.maxBounceRate ?? 0;
    if (bBounce !== aBounce) return bBounce - aBounce;
    if (!a.lastDnsCheck && b.lastDnsCheck) return -1;
    if (a.lastDnsCheck && !b.lastDnsCheck) return 1;
    if (!a.lastDnsCheck && !b.lastDnsCheck) return 0;
    return (a.lastDnsCheck?.getTime() ?? 0) - (b.lastDnsCheck?.getTime() ?? 0);
  });
  return priorities;
}
__name(buildPriorityQueue, "buildPriorityQueue");
function shouldCheckBlacklist(priority) {
  if (priority.previousBlacklistHits.length > 0) return true;
  const hasBounceIssue = priority.maxBounceRate !== null && priority.maxBounceRate > BOUNCE_RATE_THRESHOLD;
  const neverChecked = !priority.lastBlacklistCheck;
  const overdueCheck = priority.lastBlacklistCheck && Date.now() - priority.lastBlacklistCheck.getTime() > BLACKLIST_CHECK_INTERVAL_MS;
  return hasBounceIssue || neverChecked || overdueCheck === true;
}
__name(shouldCheckBlacklist, "shouldCheckBlacklist");
function isDnsPersistent(firstFailingSince) {
  if (!firstFailingSince) return false;
  return Date.now() - firstFailingSince.getTime() > DNS_ESCALATION_THRESHOLD_MS;
}
__name(isDnsPersistent, "isDnsPersistent");
async function checkDomain(priority) {
  const { domain } = priority;
  const errors = [];
  let overallHealth = "unknown";
  let blacklistHits = [];
  let blacklistChecked = false;
  const dnsResult = await checkAllDns(domain);
  if (shouldCheckBlacklist(priority)) {
    try {
      const blResult = await checkBlacklists(domain);
      blacklistHits = blResult.hits.map((h) => h.list);
      blacklistChecked = true;
    } catch (err) {
      const msg = `Blacklist check failed for ${domain}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`${LOG_PREFIX3} ${msg}`);
      errors.push(msg);
      blacklistHits = priority.previousBlacklistHits;
    }
  } else {
    blacklistHits = priority.previousBlacklistHits;
  }
  let blacklistSeverity = "none";
  if (blacklistHits.length > 0) {
    if (blacklistChecked) {
      try {
        const { DNSBL_LIST } = await import("../../../blacklist-A4J6JKHU.mjs");
        const hasCritical = blacklistHits.some((hitName) => {
          const entry = DNSBL_LIST.find((e) => e.name === hitName);
          return entry?.tier === "critical";
        });
        blacklistSeverity = hasCritical ? "critical" : "warning";
      } catch {
        blacklistSeverity = "warning";
      }
    } else {
      blacklistSeverity = priority.previousBlacklistSeverity;
    }
  }
  overallHealth = computeOverallHealth(dnsResult, blacklistHits, blacklistSeverity);
  const now = /* @__PURE__ */ new Date();
  const updateData = {
    spfStatus: dnsResult.spf.status,
    spfRecord: dnsResult.spf.record,
    dkimStatus: dnsResult.dkim.status,
    dkimSelectors: JSON.stringify(dnsResult.dkim.passedSelectors),
    dmarcStatus: dnsResult.dmarc.status,
    dmarcPolicy: dnsResult.dmarc.policy,
    dmarcRecord: dnsResult.dmarc.record,
    dmarcAspf: dnsResult.dmarc.aspf,
    dmarcAdkim: dnsResult.dmarc.adkim,
    mxStatus: dnsResult.mx.status,
    mxHosts: JSON.stringify(dnsResult.mx.hosts),
    mtaStsStatus: dnsResult.mtaSts.status,
    mtaStsId: dnsResult.mtaSts.id,
    tlsRptStatus: dnsResult.tlsRpt.status,
    tlsRptRua: dnsResult.tlsRpt.rua,
    bimiStatus: dnsResult.bimi.status,
    bimiLogoUrl: dnsResult.bimi.logoUrl,
    bimiVmcUrl: dnsResult.bimi.vmcUrl,
    overallHealth,
    lastDnsCheck: now
  };
  if (blacklistChecked) {
    updateData.blacklistHits = JSON.stringify(blacklistHits);
    updateData.blacklistSeverity = blacklistSeverity;
    updateData.lastBlacklistCheck = now;
  }
  try {
    await prisma.domainHealth.upsert({
      where: { domain },
      create: {
        domain,
        ...updateData
      },
      update: updateData
    });
  } catch (err) {
    const msg = `DomainHealth upsert failed for ${domain}: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`${LOG_PREFIX3} ${msg}`);
    errors.push(msg);
  }
  const notificationData = await sendChangeNotifications(priority, dnsResult, blacklistHits, blacklistChecked);
  return {
    domain,
    dnsChecked: true,
    blacklistChecked,
    overallHealth,
    blacklistHits,
    errors,
    notificationData
  };
}
__name(checkDomain, "checkDomain");
async function sendChangeNotifications(priority, dnsResult, currentBlacklistHits, blacklistChecked) {
  const { domain, previousBlacklistHits, firstFailingSince } = priority;
  const data = {};
  if (blacklistChecked) {
    const newHits = currentBlacklistHits.filter(
      (hit) => !previousBlacklistHits.includes(hit)
    );
    const removedHits = previousBlacklistHits.filter(
      (hit) => !currentBlacklistHits.includes(hit)
    );
    if (newHits.length > 0) {
      try {
        const { DNSBL_LIST } = await import("../../../blacklist-A4J6JKHU.mjs");
        const hitsWithDetails = newHits.map((hitName) => {
          const entry = DNSBL_LIST.find((e) => e.name === hitName);
          return {
            list: hitName,
            tier: entry?.tier ?? "warning",
            delistUrl: entry?.delistUrl
          };
        });
        await notifyBlacklistHit({ domain, hits: hitsWithDetails, skipEmail: true });
        data.blacklistHits = { domain, hits: hitsWithDetails };
      } catch (err) {
        console.error(`${LOG_PREFIX3} Failed to send blacklist hit notification for ${domain}:`, err);
      }
    }
    if (removedHits.length > 0) {
      try {
        await notifyBlacklistDelisted({ domain, delistedFrom: removedHits });
      } catch (err) {
        console.error(`${LOG_PREFIX3} Failed to send delist notification for ${domain}:`, err);
      }
    }
  }
  const failures = [];
  if (dnsResult.spf.status === "fail" || dnsResult.spf.status === "missing") {
    failures.push({ check: "spf", status: dnsResult.spf.status });
  }
  if (dnsResult.dkim.status === "fail" || dnsResult.dkim.status === "missing") {
    failures.push({ check: "dkim", status: dnsResult.dkim.status });
  }
  if (dnsResult.dmarc.status === "fail" || dnsResult.dmarc.status === "missing") {
    failures.push({ check: "dmarc", status: dnsResult.dmarc.status });
  }
  if (dnsResult.mx.status === "missing") {
    failures.push({ check: "mx", status: dnsResult.mx.status });
  }
  if (failures.length > 0) {
    const persistent = isDnsPersistent(firstFailingSince);
    try {
      await notifyDnsFailure({ domain, failures, persistent, skipEmail: true });
      data.dnsFailures = { domain, failures, persistent };
    } catch (err) {
      console.error(`${LOG_PREFIX3} Failed to send DNS failure notification for ${domain}:`, err);
    }
  }
  return data;
}
__name(sendChangeNotifications, "sendChangeNotifications");
var domainHealthTask = schedules_exports.task({
  id: "domain-health",
  cron: "0 8,20 * * *",
  // twice daily: 8am + 8pm UTC
  maxDuration: 300,
  // 5 min — enough for full domain fleet
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5e3,
    maxTimeoutInMs: 6e4
  },
  run: /* @__PURE__ */ __name(async () => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    console.log(`${LOG_PREFIX3} Starting domain health check at ${timestamp}`);
    const allDomains = await collectSendingDomains();
    if (allDomains.length === 0) {
      console.log(`${LOG_PREFIX3} No sending domains found — nothing to check`);
      return {
        domainsChecked: 0,
        domainsTotal: 0,
        results: [],
        errors: []
      };
    }
    const prioritized = await buildPriorityQueue(allDomains);
    const toCheck = prioritized;
    console.log(
      `${LOG_PREFIX3} Checking ${toCheck.length} of ${allDomains.length} domains: ${toCheck.map((d) => d.domain).join(", ")}`
    );
    const domainResults = await Promise.allSettled(
      toCheck.map((priority) => checkDomain(priority))
    );
    const results = [];
    const allErrors = [];
    const blacklistDigestItems = [];
    const dnsFailureDigestItems = [];
    for (const settled of domainResults) {
      if (settled.status === "fulfilled") {
        const result = settled.value;
        results.push(result);
        allErrors.push(...result.errors);
        if (result.notificationData.blacklistHits) {
          blacklistDigestItems.push(result.notificationData.blacklistHits);
        }
        if (result.notificationData.dnsFailures) {
          dnsFailureDigestItems.push(result.notificationData.dnsFailures);
        }
      } else {
        allErrors.push(`Domain check failed: ${settled.reason}`);
      }
    }
    try {
      await sendBlacklistDigestEmail(blacklistDigestItems);
    } catch (err) {
      console.error(`${LOG_PREFIX3} Failed to send blacklist digest email:`, err);
    }
    try {
      await sendDnsFailureDigestEmail(dnsFailureDigestItems);
    } catch (err) {
      console.error(`${LOG_PREFIX3} Failed to send DNS failure digest email:`, err);
    }
    console.log(
      `${LOG_PREFIX3} Step 1 complete: ${results.length} domains checked, ${allErrors.length} errors`
    );
    if (allErrors.length > 0) {
      console.warn(`${LOG_PREFIX3} Errors during domain health check:`, allErrors);
    }
    console.log(`${LOG_PREFIX3} Step 2: Bounce snapshot capture`);
    let bounceSnapshotResult = {
      workspaces: 0,
      senders: 0,
      errors: []
    };
    try {
      bounceSnapshotResult = await captureAllWorkspaces();
      console.log(
        `${LOG_PREFIX3} Step 2 complete: ${bounceSnapshotResult.workspaces} workspaces, ${bounceSnapshotResult.senders} senders captured, ${bounceSnapshotResult.errors.length} errors`
      );
      if (bounceSnapshotResult.errors.length > 0) {
        console.warn(`${LOG_PREFIX3} Bounce snapshot errors:`, bounceSnapshotResult.errors);
      }
    } catch (err) {
      console.error(`${LOG_PREFIX3} Bounce snapshot capture failed:`, err);
      bounceSnapshotResult.errors.push(err instanceof Error ? err.message : String(err));
    }
    return {
      domainsChecked: results.length,
      domainsTotal: allDomains.length,
      results: results.map((r) => ({
        domain: r.domain,
        overallHealth: r.overallHealth,
        blacklistChecked: r.blacklistChecked,
        blacklistHits: r.blacklistHits.length,
        errors: r.errors.length
      })),
      errors: allErrors,
      bounceSnapshots: {
        workspaces: bounceSnapshotResult.workspaces,
        senders: bounceSnapshotResult.senders,
        errors: bounceSnapshotResult.errors.length
      }
    };
  }, "run")
});
export {
  domainHealthTask
};
//# sourceMappingURL=domain-health.mjs.map
