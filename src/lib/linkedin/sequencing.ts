/**
 * LinkedIn Sequencing Engine — template compilation and sequence rule evaluation.
 *
 * Handles:
 * - Handlebars template compilation for LinkedIn messages
 * - CampaignSequenceRule evaluation triggered by email events or connection accepts
 * - Campaign sequence rule creation at deploy time
 */
import Handlebars from "handlebars";
import { prisma } from "@/lib/db";

// ─── Template Engine ─────────────────────────────────────────────────────────

/**
 * Compile a Handlebars template string against a context object.
 * Uses `noEscape: true` — LinkedIn messages are plain text, not HTML.
 * Gracefully returns the raw template string on compilation error.
 */
export function compileTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  try {
    const compiled = Handlebars.compile(template, { noEscape: true });
    return compiled(context);
  } catch (err) {
    console.warn("[sequencing] Template compilation failed, returning raw template:", err);
    return template;
  }
}

/**
 * Build the Handlebars context object from person and optional email event data.
 * All nullable fields default to empty string for safe rendering.
 */
export function buildTemplateContext(
  person: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    jobTitle?: string | null;
    linkedinUrl?: string | null;
  },
  emailContext?: {
    stepRef?: string;
    subject?: string;
    opened?: boolean;
    clicked?: boolean;
  },
): Record<string, unknown> {
  return {
    // Person fields
    firstName: person.firstName ?? "",
    lastName: person.lastName ?? "",
    companyName: person.company ?? "",
    jobTitle: person.jobTitle ?? "",
    linkedinUrl: person.linkedinUrl ?? "",

    // Email context fields
    emailStepRef: emailContext?.stepRef ?? "",
    emailSubject: emailContext?.subject ?? "",
    emailOpened: emailContext?.opened ?? false,
    emailClicked: emailContext?.clicked ?? false,
  };
}

// ─── Sequence Rule Evaluation ─────────────────────────────────────────────────

export interface SequenceActionDescriptor {
  actionType: string;
  messageBody: string | null;
  delayMinutes: number;
  sequenceStepRef: string;
}

export interface EvaluateSequenceRulesParams {
  workspaceSlug: string;
  campaignName: string;
  triggerEvent: "email_sent" | "connection_accepted";
  triggerStepRef?: string;
  personId: string;
  person: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    jobTitle?: string | null;
    linkedinUrl?: string | null;
    email: string;
  };
  emailContext?: {
    stepRef?: string;
    subject?: string;
    opened?: boolean;
    clicked?: boolean;
  };
  senderEmail?: string;
}

/**
 * Evaluate all CampaignSequenceRules matching the given trigger event for a
 * campaign, returning action descriptors that the caller should enqueue.
 *
 * The caller (webhook handler, deploy engine, etc.) is responsible for
 * calling enqueueAction() with each returned descriptor.
 */
export async function evaluateSequenceRules(
  params: EvaluateSequenceRulesParams,
): Promise<SequenceActionDescriptor[]> {
  const {
    workspaceSlug,
    campaignName,
    triggerEvent,
    triggerStepRef,
    personId,
    person,
    emailContext,
  } = params;

  // 1. Query matching rules
  const rules = await prisma.campaignSequenceRule.findMany({
    where: {
      workspaceSlug,
      campaignName,
      triggerEvent,
      // If a triggerStepRef is provided, filter to rules referencing that step
      ...(triggerStepRef !== undefined
        ? { triggerStepRef }
        : {}),
    },
    orderBy: { position: "asc" },
  });

  const descriptors: SequenceActionDescriptor[] = [];

  for (const rule of rules) {
    // 2. If rule requires connected status, check the connection record
    if (rule.requireConnected) {
      const connection = await prisma.linkedInConnection.findFirst({
        where: { personId, status: "connected" },
      });
      if (!connection) {
        // Not yet connected — skip this rule
        continue;
      }
    }

    // 3. Build template context and compile message
    const context = buildTemplateContext(person, emailContext);
    const messageBody = rule.messageTemplate
      ? compileTemplate(rule.messageTemplate, context)
      : null;

    descriptors.push({
      actionType: rule.actionType,
      messageBody,
      delayMinutes: rule.delayMinutes,
      sequenceStepRef: `rule_${rule.id}`,
    });
  }

  return descriptors;
}

// ─── Campaign Sequence Rule Creation ─────────────────────────────────────────

export interface LinkedInSequenceStep {
  position: number;
  type: string;           // "connect" | "message" | "profile_view"
  body?: string;          // Optional message template
  delayHours?: number;    // Delay before executing
  triggerEvent?: string;  // Override trigger event
  triggerStepRef?: string;
  requireConnected?: boolean;
}

export interface CreateSequenceRulesParams {
  workspaceSlug: string;
  campaignName: string;
  linkedinSequence: LinkedInSequenceStep[];
}

/**
 * Create CampaignSequenceRule records from a campaign's linkedinSequence array.
 * Called during campaign deploy to set up the sequencing engine.
 *
 * Existing rules for the campaign are deleted first to allow idempotent deploys.
 */
export async function createSequenceRulesForCampaign(
  params: CreateSequenceRulesParams,
): Promise<void> {
  const { workspaceSlug, campaignName, linkedinSequence } = params;

  // Delete existing rules for this campaign (idempotent deploy support)
  await prisma.campaignSequenceRule.deleteMany({
    where: { workspaceSlug, campaignName },
  });

  if (linkedinSequence.length === 0) return;

  const data = linkedinSequence.map((step) => ({
    workspaceSlug,
    campaignName,
    triggerEvent:
      step.triggerEvent ?? (step.position === 1 ? "delay_after_previous" : "email_sent"),
    triggerStepRef: step.triggerEvent === "email_sent" || (!step.triggerEvent && step.position !== 1)
      ? (step.triggerStepRef ?? `email_${step.position}`)
      : (step.triggerStepRef ?? null),
    actionType: step.type,
    messageTemplate: step.body ?? null,
    delayMinutes: (step.delayHours ?? 0) * 60,
    requireConnected: step.requireConnected ?? step.type === "message",
    position: step.position,
  }));

  await prisma.campaignSequenceRule.createMany({ data });
}
