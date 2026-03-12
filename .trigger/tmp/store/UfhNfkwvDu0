import {
  prisma
} from "../../../chunk-6UNNRELO.mjs";
import {
  require_default
} from "../../../chunk-6DNKPBNV.mjs";
import {
  task
} from "../../../chunk-VSCNBRAB.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/linkedin-fast-track.ts
init_esm();
var import_client = __toESM(require_default());

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

// trigger/linkedin-fast-track.ts
var prisma2 = new import_client.PrismaClient();
var linkedinFastTrack = task({
  id: "linkedin-fast-track",
  // No queue — pure DB queries + LinkedIn action enqueue (no Anthropic or EmailBison)
  maxDuration: 30,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1e3,
    maxTimeoutInMs: 5e3
  },
  run: /* @__PURE__ */ __name(async (payload) => {
    const { personEmail, workspaceSlug, senderEmail, campaignName } = payload;
    const person = await prisma2.person.findUnique({
      where: { email: personEmail },
      select: { id: true, linkedinUrl: true }
    });
    if (!person?.linkedinUrl) {
      console.log(
        `[linkedin-fast-track] No person or no linkedinUrl for ${personEmail} — skipping`
      );
      return { skipped: true, reason: "no_linkedin_url" };
    }
    const bumped = await bumpPriority(person.id, workspaceSlug);
    if (bumped) {
      console.log(
        `[linkedin-fast-track] Bumped existing connect action to P1 for ${personEmail}`
      );
      return { bumped: true, enqueued: false };
    }
    const existingConnection = await prisma2.linkedInConnection.findFirst({
      where: { personId: person.id, sender: { workspaceSlug } },
      select: { status: true }
    });
    if (existingConnection && existingConnection.status !== "none") {
      console.log(
        `[linkedin-fast-track] Already connected (status=${existingConnection.status}) for ${personEmail} — skipping`
      );
      return { skipped: true, reason: "already_connected" };
    }
    const sender = await assignSenderForPerson(workspaceSlug, {
      emailSenderAddress: senderEmail ?? void 0,
      mode: senderEmail ? "email_linkedin" : "linkedin_only"
    });
    if (!sender) {
      console.log(
        `[linkedin-fast-track] No active sender found for workspace ${workspaceSlug} — skipping`
      );
      return { skipped: true, reason: "no_active_sender" };
    }
    const actionId = await enqueueAction({
      senderId: sender.id,
      personId: person.id,
      workspaceSlug,
      actionType: "connect",
      priority: 1,
      scheduledFor: /* @__PURE__ */ new Date(),
      // ASAP
      campaignName
    });
    console.log(
      `[linkedin-fast-track] Enqueued P1 connect action ${actionId} for ${personEmail} via sender ${sender.id}`
    );
    return { bumped: false, enqueued: true, actionId };
  }, "run")
});
export {
  linkedinFastTrack
};
//# sourceMappingURL=linkedin-fast-track.mjs.map
