import { task } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getClientForWorkspace } from "@/lib/workspaces";
import { notifyOooReengaged } from "@/lib/notifications";
import { emailBisonQueue } from "./queues";

// PrismaClient at module scope — not inside run() (pattern from smoke-test.ts)
const prisma = new PrismaClient();

export interface OooReengagePayload {
  personEmail: string;
  workspaceSlug: string;
  oooReason: "holiday" | "illness" | "conference" | "generic";
  eventName: string | null;
  originalCampaignId: string | null;
  ebLeadId: number | null;
  reengagementId: string;
}

// Reason-based openers — locked decision from CONTEXT.md
const OOO_OPENERS: Record<string, string> = {
  holiday: "Hope you had a great break!",
  illness: "Hope you're feeling better!",
  conference: "Hope the conference was good!",
  generic: "Hope all is well!",
};

export const oooReengage = task({
  id: "ooo-reengage",
  queue: emailBisonQueue,
  maxDuration: 120,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 30_000,
  },

  run: async (payload: OooReengagePayload) => {
    const { personEmail, workspaceSlug, oooReason, eventName, originalCampaignId } = payload;

    console.log("[ooo-reengage] task triggered", {
      personEmail,
      workspaceSlug,
      oooReason,
      reengagementId: payload.reengagementId,
    });

    // ----------------------------------------------------------------
    // Step 1: Load OooReengagement record
    // Look up by personEmail + workspaceSlug + status=pending
    // (reengagementId is empty string in payload — immutable after scheduling)
    // ----------------------------------------------------------------

    const record = await prisma.oooReengagement.findFirst({
      where: {
        personEmail,
        workspaceSlug,
        status: "pending",
      },
    });

    if (!record) {
      console.log("[ooo-reengage] No pending record found — already processed or cancelled", {
        personEmail,
        workspaceSlug,
      });
      return { success: false, reason: "no-pending-record" };
    }

    // ----------------------------------------------------------------
    // Step 2: Get EmailBison client for this workspace
    // ----------------------------------------------------------------

    let ebClient;
    try {
      ebClient = await getClientForWorkspace(workspaceSlug);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await prisma.oooReengagement.update({
        where: { id: record.id },
        data: { status: "failed", failureReason: `Workspace config error: ${reason}` },
      });
      return { success: false, reason: "workspace-not-found" };
    }

    // ----------------------------------------------------------------
    // Step 3: Resolve EB lead ID
    // ----------------------------------------------------------------

    let ebLeadId: number | null = record.ebLeadId ?? payload.ebLeadId ?? null;

    if (!ebLeadId) {
      console.log("[ooo-reengage] ebLeadId not in record, searching EB by email", { personEmail });
      const lead = await ebClient.findLeadByEmail(workspaceSlug, personEmail);
      if (lead) {
        ebLeadId = lead.id;
      }
    }

    if (!ebLeadId) {
      const reason = "Lead not found in EmailBison";
      console.error("[ooo-reengage] Lead not found in EB", { personEmail, workspaceSlug });
      await prisma.oooReengagement.update({
        where: { id: record.id },
        data: { status: "failed", failureReason: reason },
      });
      return { success: false, reason: "lead-not-found" };
    }

    // ----------------------------------------------------------------
    // Step 4: Load original campaign copy + adapt via Haiku
    // ----------------------------------------------------------------

    const reasonOpener = eventName && oooReason === "conference"
      ? `Hope ${eventName} was good!`
      : (OOO_OPENERS[oooReason] ?? OOO_OPENERS.generic);

    let adaptedBody: string | null = null;

    try {
      const campaignId = originalCampaignId ?? record.originalCampaignId;
      if (campaignId) {
        const campaign = await prisma.campaign.findFirst({
          where: { id: campaignId },
          select: { emailSequence: true, name: true },
        });

        if (campaign?.emailSequence) {
          // Parse emailSequence JSON — array of { position, subjectLine, body, delayDays, ... }
          let steps: Array<{ position?: number; body?: string }> = [];
          try {
            steps = JSON.parse(campaign.emailSequence);
          } catch {
            console.warn("[ooo-reengage] Failed to parse emailSequence JSON");
          }

          // Extract step 2 body (fallback to step 3, then step 1)
          const sorted = [...steps].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          const stepBody =
            sorted.find((s) => s.position === 2)?.body ??
            sorted.find((s) => s.position === 3)?.body ??
            sorted.find((s) => s.position === 1)?.body ??
            null;

          if (stepBody) {
            const result = await generateText({
              model: anthropic("claude-haiku-4-5-20251001"),
              system:
                "You are a warm, professional email copywriter. Adapt the following campaign email for a re-engagement after an out-of-office period. Keep the original value proposition and call-to-action but add the OOO-aware opener and a thread reference. Tone: warm and casual.",
              prompt: [
                `OOO opener: "${reasonOpener}"`,
                "",
                "Original campaign email body:",
                stepBody,
                "",
                'Instruction: Write the adapted Welcome Back message. Start with the OOO opener, then naturally transition into the original message content. Reference the original conversation where appropriate ("When we last spoke about [topic]..."). Keep it concise and warm.',
              ].join("\n"),
            });
            adaptedBody = result.text;
          }
        }
      }
    } catch (err) {
      // Haiku adaptation failure is non-blocking — fall back to generic opener
      console.warn("[ooo-reengage] Campaign copy adaptation failed, using generic fallback:", err);
    }

    // Fall back to generic message if adaptation failed or no campaign
    if (!adaptedBody) {
      adaptedBody = `${reasonOpener} I wanted to reach back out and continue our conversation. Would love to reconnect when you have a moment.`;
    }

    // ----------------------------------------------------------------
    // Step 5: Find or create Welcome Back campaign (resolve EB campaign ID)
    // ----------------------------------------------------------------

    let ebCampaignId: number | null = null;

    // Check local DB for a Welcome Back campaign for this workspace
    const welcomeBackCampaign = await prisma.campaign.findFirst({
      where: {
        workspaceSlug,
        name: { contains: "Welcome Back" },
        emailBisonCampaignId: { not: null },
      },
      select: { emailBisonCampaignId: true },
    });

    if (welcomeBackCampaign?.emailBisonCampaignId) {
      ebCampaignId = welcomeBackCampaign.emailBisonCampaignId;
      console.log("[ooo-reengage] Found Welcome Back campaign in DB", { ebCampaignId });
    } else {
      // Fall back to original campaign's deployed EB campaign ID
      const campaignId = originalCampaignId ?? record.originalCampaignId;
      if (campaignId) {
        const deploy = await prisma.campaignDeploy.findFirst({
          where: { campaignId, emailBisonCampaignId: { not: null } },
          orderBy: { createdAt: "desc" },
          select: { emailBisonCampaignId: true },
        });
        if (deploy?.emailBisonCampaignId) {
          ebCampaignId = deploy.emailBisonCampaignId;
          console.log("[ooo-reengage] Using original campaign EB ID from deploy", { ebCampaignId });
        }
      }
    }

    if (!ebCampaignId) {
      const reason = "No Welcome Back campaign found and no original campaign deploy available";
      console.error("[ooo-reengage]", reason, { workspaceSlug });
      await prisma.oooReengagement.update({
        where: { id: record.id },
        data: { status: "failed", failureReason: reason },
      });
      return { success: false, reason: "no-campaign-found" };
    }

    // ----------------------------------------------------------------
    // Step 6: Enroll lead into campaign via EB API
    // ----------------------------------------------------------------

    try {
      await ebClient.attachLeadsToCampaign(ebCampaignId, [ebLeadId]);
      console.log("[ooo-reengage] Lead enrolled in campaign", {
        personEmail,
        ebLeadId,
        ebCampaignId,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error("[ooo-reengage] Failed to attach lead to campaign:", err);
      await prisma.oooReengagement.update({
        where: { id: record.id },
        data: { status: "failed", failureReason: `EB enroll failed: ${reason}` },
      });
      throw err; // Trigger Trigger.dev retry
    }

    // ----------------------------------------------------------------
    // Step 7: Update OooReengagement status to "sent"
    // ----------------------------------------------------------------

    await prisma.oooReengagement.update({
      where: { id: record.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        welcomeBackCampaignId: ebCampaignId,
      },
    });

    // ----------------------------------------------------------------
    // Step 8: Clear Person OOO fields — person is no longer OOO
    // ----------------------------------------------------------------

    await prisma.person.updateMany({
      where: { email: personEmail },
      data: {
        oooUntil: null,
        oooReason: null,
        oooDetectedAt: null,
      },
    });

    // ----------------------------------------------------------------
    // Step 9: Notify workspace Slack channel
    // ----------------------------------------------------------------

    await notifyOooReengaged({
      workspaceSlug,
      count: 1,
      leadEmails: [personEmail],
    });

    console.log("[ooo-reengage] Re-engagement complete", { personEmail, workspaceSlug, ebCampaignId });

    return {
      success: true,
      personEmail,
      workspaceSlug,
      ebLeadId,
      ebCampaignId,
    };
  },
});
