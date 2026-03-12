import {
  prisma
} from "./chunk-6UNNRELO.mjs";
import {
  __name,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// src/lib/linkedin/rate-limiter.ts
init_esm();

// src/lib/linkedin/types.ts
init_esm();

// src/lib/linkedin/rate-limiter.ts
var WARMUP_SCHEDULE = [
  { maxDay: 7, connections: 5, messages: 5, profileViews: 10 },
  { maxDay: 14, connections: 8, messages: 10, profileViews: 20 },
  { maxDay: 21, connections: 12, messages: 20, profileViews: 30 },
  { maxDay: Infinity, connections: 20, messages: 30, profileViews: 50 }
];
function getWarmupLimits(warmupDay) {
  if (warmupDay <= 0) {
    return { connections: 5, messages: 10, profileViews: 15 };
  }
  const tier = WARMUP_SCHEDULE.find((t) => warmupDay <= t.maxDay);
  return {
    connections: tier.connections,
    messages: tier.messages,
    profileViews: tier.profileViews
  };
}
__name(getWarmupLimits, "getWarmupLimits");
async function progressWarmup(senderId) {
  const sender = await prisma.sender.findUnique({ where: { id: senderId } });
  if (!sender || sender.warmupDay <= 0) return;
  if (sender.warmupStartedAt) {
    const daysSinceStart = Math.floor(
      (Date.now() - sender.warmupStartedAt.getTime()) / (24 * 60 * 60 * 1e3)
    );
    const expectedDay = daysSinceStart + 1;
    if (sender.warmupDay >= expectedDay) return;
  }
  if (sender.acceptanceRate !== null && sender.acceptanceRate < 0.2) {
    return;
  }
  const newDay = sender.warmupDay + 1;
  const limits = getWarmupLimits(newDay);
  await prisma.sender.update({
    where: { id: senderId },
    data: {
      warmupDay: newDay,
      dailyConnectionLimit: limits.connections,
      dailyMessageLimit: limits.messages,
      dailyProfileViewLimit: limits.profileViews
    }
  });
}
__name(progressWarmup, "progressWarmup");

// src/lib/linkedin/queue.ts
init_esm();
async function enqueueAction(params) {
  const {
    senderId,
    personId,
    workspaceSlug,
    actionType,
    messageBody,
    priority = 5,
    scheduledFor = /* @__PURE__ */ new Date(),
    campaignName,
    emailBisonLeadId,
    sequenceStepRef
  } = params;
  const action = await prisma.linkedInAction.create({
    data: {
      senderId,
      personId,
      workspaceSlug,
      actionType,
      messageBody: messageBody ?? null,
      priority,
      scheduledFor,
      status: "pending",
      campaignName: campaignName ?? null,
      emailBisonLeadId: emailBisonLeadId ?? null,
      sequenceStepRef: sequenceStepRef ?? null
    }
  });
  return action.id;
}
__name(enqueueAction, "enqueueAction");
async function bumpPriority(personId, workspaceSlug) {
  const result = await prisma.linkedInAction.updateMany({
    where: {
      personId,
      workspaceSlug,
      status: "pending",
      actionType: "connect"
    },
    data: {
      priority: 1,
      scheduledFor: /* @__PURE__ */ new Date()
      // execute ASAP
    }
  });
  return result.count > 0;
}
__name(bumpPriority, "bumpPriority");
async function expireStaleActions(maxAgeDays = 14) {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1e3);
  const result = await prisma.linkedInAction.updateMany({
    where: {
      status: "pending",
      actionType: "connect",
      scheduledFor: { lt: cutoff }
    },
    data: { status: "expired" }
  });
  return result.count;
}
__name(expireStaleActions, "expireStaleActions");
async function recoverStuckActions() {
  const cutoff = new Date(Date.now() - 10 * 60 * 1e3);
  const stuckActions = await prisma.linkedInAction.findMany({
    where: {
      status: "running",
      lastAttemptAt: { lt: cutoff }
    }
  });
  let recovered = 0;
  for (const action of stuckActions) {
    const retriesExhausted = action.attempts >= action.maxAttempts;
    await prisma.linkedInAction.update({
      where: { id: action.id },
      data: {
        status: retriesExhausted ? "failed" : "pending",
        result: JSON.stringify({ error: "Worker crash recovery" })
      }
    });
    recovered++;
  }
  return recovered;
}
__name(recoverStuckActions, "recoverStuckActions");

// src/lib/linkedin/sender.ts
init_esm();
async function getActiveSenders(workspaceSlug) {
  return prisma.sender.findMany({
    where: { workspaceSlug, status: "active" },
    orderBy: { createdAt: "asc" }
  });
}
__name(getActiveSenders, "getActiveSenders");
async function assignSenderForPerson(workspaceSlug, options) {
  const activeSenders = await getActiveSenders(workspaceSlug);
  if (activeSenders.length === 0) return null;
  if (options.mode === "email_linkedin" && options.emailSenderAddress) {
    const matched = activeSenders.find(
      (s) => s.emailAddress?.toLowerCase() === options.emailSenderAddress.toLowerCase()
    );
    return matched ?? null;
  }
  const today = /* @__PURE__ */ new Date();
  today.setUTCHours(0, 0, 0, 0);
  const sendersWithUsage = await Promise.all(
    activeSenders.map(async (sender) => {
      const usage = await prisma.linkedInDailyUsage.findUnique({
        where: { senderId_date: { senderId: sender.id, date: today } }
      });
      const totalUsed = usage ? usage.connectionsSent + usage.messagesSent + usage.profileViews : 0;
      return { sender, totalUsed };
    })
  );
  sendersWithUsage.sort((a, b) => a.totalUsed - b.totalUsed);
  return sendersWithUsage[0]?.sender ?? null;
}
__name(assignSenderForPerson, "assignSenderForPerson");
async function updateAcceptanceRate(senderId) {
  const totalSent = await prisma.linkedInConnection.count({
    where: { senderId, status: { in: ["pending", "connected", "expired"] } }
  });
  if (totalSent === 0) return null;
  const accepted = await prisma.linkedInConnection.count({
    where: { senderId, status: "connected" }
  });
  const rate = accepted / totalSent;
  await prisma.sender.update({
    where: { id: senderId },
    data: { acceptanceRate: rate }
  });
  return rate;
}
__name(updateAcceptanceRate, "updateAcceptanceRate");

export {
  progressWarmup,
  enqueueAction,
  bumpPriority,
  expireStaleActions,
  recoverStuckActions,
  assignSenderForPerson,
  updateAcceptanceRate
};
//# sourceMappingURL=chunk-5NGDKPHQ.mjs.map
