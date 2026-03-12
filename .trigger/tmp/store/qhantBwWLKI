import {
  assignSenderForPerson,
  bumpPriority,
  enqueueAction
} from "../../../chunk-LFKYFY6X.mjs";
import "../../../chunk-6UNNRELO.mjs";
import {
  require_default
} from "../../../chunk-6DNKPBNV.mjs";
import {
  task
} from "../../../chunk-LNHUL6B5.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/linkedin-fast-track.ts
init_esm();
var import_client = __toESM(require_default());
var prisma = new import_client.PrismaClient();
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
    const person = await prisma.person.findUnique({
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
    const existingConnection = await prisma.linkedInConnection.findFirst({
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
      campaignName: campaignName ?? void 0
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
