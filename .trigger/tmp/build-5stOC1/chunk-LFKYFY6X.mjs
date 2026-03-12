import {
  prisma
} from "./chunk-6UNNRELO.mjs";
import {
  __name,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// src/lib/linkedin/queue.ts
init_esm();

// src/lib/linkedin/rate-limiter.ts
init_esm();

// src/lib/linkedin/types.ts
init_esm();

// src/lib/linkedin/queue.ts
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

export {
  enqueueAction,
  bumpPriority,
  assignSenderForPerson
};
//# sourceMappingURL=chunk-LFKYFY6X.mjs.map
