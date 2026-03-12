import {
  EmailBisonClient
} from "./chunk-HYVNS55X.mjs";
import {
  prisma
} from "./chunk-6UNNRELO.mjs";
import {
  __name,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// src/lib/domain-health/snapshots.ts
init_esm();
var MIN_SENDS_FOR_RATE = 20;
function computeDeltas(_senderEmail, current, previous) {
  if (!previous) {
    return { deltaSent: null, deltaBounced: null, deltaReplied: null };
  }
  if (current.emailsSent < previous.emailsSent || current.bounced < previous.bounced || current.replied < previous.replied) {
    return { deltaSent: null, deltaBounced: null, deltaReplied: null };
  }
  return {
    deltaSent: current.emailsSent - previous.emailsSent,
    deltaBounced: current.bounced - previous.bounced,
    deltaReplied: current.replied - previous.replied
  };
}
__name(computeDeltas, "computeDeltas");
async function captureSnapshots(workspaceSlug, apiToken) {
  const errors = [];
  let captured = 0;
  const client = new EmailBisonClient(apiToken);
  let senderEmails;
  try {
    senderEmails = await client.getSenderEmails();
  } catch (err) {
    const msg = `[domain-health] Failed to fetch sender emails for ${workspaceSlug}: ${err instanceof Error ? err.message : String(err)}`;
    console.error(msg);
    return { captured: 0, errors: [msg] };
  }
  let warmupMap = /* @__PURE__ */ new Map();
  try {
    const { fetchWarmupData } = await import("./warmup-5F3YOQEH.mjs");
    const warmupItems = await fetchWarmupData(apiToken);
    for (const item of warmupItems) {
      warmupMap.set(item.email.toLowerCase(), {
        warmupEnabled: item.warmupEnabled,
        warmupData: JSON.stringify(item)
      });
    }
    console.log(
      `[domain-health] Warmup data fetched for ${workspaceSlug}: ${warmupItems.length} entries`
    );
  } catch (err) {
    console.warn(
      `[domain-health] Warmup data unavailable for ${workspaceSlug}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  const now = /* @__PURE__ */ new Date();
  const snapshotDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  for (const sender of senderEmails) {
    try {
      const senderEmail = sender.email.toLowerCase();
      const senderDomain = senderEmail.split("@")[1] ?? "unknown";
      const previousSnapshot = await prisma.bounceSnapshot.findFirst({
        where: {
          senderEmail,
          snapshotDate: { lt: snapshotDate }
        },
        orderBy: { snapshotDate: "desc" }
      });
      const currentMetrics = {
        emailsSent: sender.emails_sent_count,
        bounced: sender.bounced_count,
        replied: sender.total_replied_count
      };
      const previousMetrics = previousSnapshot ? {
        emailsSent: previousSnapshot.emailsSent,
        bounced: previousSnapshot.bounced,
        replied: previousSnapshot.replied
      } : null;
      const { deltaSent, deltaBounced, deltaReplied } = computeDeltas(
        senderEmail,
        currentMetrics,
        previousMetrics
      );
      let bounceRate = null;
      if (deltaSent !== null && deltaSent > 0) {
        bounceRate = (deltaBounced ?? 0) / deltaSent;
      } else if (deltaSent === null) {
        if (sender.emails_sent_count >= MIN_SENDS_FOR_RATE) {
          bounceRate = sender.bounced_count / sender.emails_sent_count;
        }
      }
      const warmupEntry = warmupMap.get(senderEmail);
      await prisma.bounceSnapshot.upsert({
        where: {
          senderEmail_snapshotDate: {
            senderEmail,
            snapshotDate
          }
        },
        create: {
          workspaceSlug,
          senderEmail,
          senderDomain,
          emailsSent: sender.emails_sent_count,
          bounced: sender.bounced_count,
          replied: sender.total_replied_count,
          opened: sender.unique_opened_count,
          deltaSent,
          deltaBounced,
          deltaReplied,
          bounceRate,
          warmupEnabled: warmupEntry?.warmupEnabled ?? sender.warmup_enabled ?? null,
          warmupData: warmupEntry?.warmupData ?? null,
          snapshotDate
        },
        update: {
          emailsSent: sender.emails_sent_count,
          bounced: sender.bounced_count,
          replied: sender.total_replied_count,
          opened: sender.unique_opened_count,
          deltaSent,
          deltaBounced,
          deltaReplied,
          bounceRate,
          warmupEnabled: warmupEntry?.warmupEnabled ?? sender.warmup_enabled ?? null,
          warmupData: warmupEntry?.warmupData ?? null
        }
      });
      captured++;
    } catch (err) {
      const msg = `[domain-health] Failed to upsert snapshot for ${sender.email} (${workspaceSlug}): ${err instanceof Error ? err.message : String(err)}`;
      console.error(msg);
      errors.push(msg);
    }
  }
  console.log(
    `[domain-health] Snapshot capture complete for ${workspaceSlug}: ${captured} senders captured, ${errors.length} errors`
  );
  return { captured, errors };
}
__name(captureSnapshots, "captureSnapshots");
async function captureAllWorkspaces() {
  const workspaces = await prisma.workspace.findMany({
    where: {
      apiToken: { not: null },
      status: { not: "onboarding" }
    },
    select: { slug: true, name: true, apiToken: true }
  });
  let totalSenders = 0;
  const allErrors = [];
  for (const workspace of workspaces) {
    if (!workspace.apiToken) continue;
    const result = await captureSnapshots(workspace.slug, workspace.apiToken);
    totalSenders += result.captured;
    allErrors.push(...result.errors);
  }
  console.log(
    `[domain-health] All workspaces snapshot complete: ${workspaces.length} workspaces, ${totalSenders} senders, ${allErrors.length} errors`
  );
  return {
    workspaces: workspaces.length,
    senders: totalSenders,
    errors: allErrors
  };
}
__name(captureAllWorkspaces, "captureAllWorkspaces");

export {
  captureAllWorkspaces
};
//# sourceMappingURL=chunk-VCAHU2YN.mjs.map
