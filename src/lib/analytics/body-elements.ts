import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";

export interface BodyElements {
  hasCtaType: boolean;
  ctaSubtype:
    | "book_a_call"
    | "reply_to_email"
    | "visit_link"
    | "download_resource"
    | null;
  hasProblemStatement: boolean;
  hasValueProposition: boolean;
  hasCaseStudy: boolean;
  hasSocialProof: boolean;
  hasPersonalization: boolean;
}

export const EMPTY_ELEMENTS: BodyElements = {
  hasCtaType: false,
  ctaSubtype: null,
  hasProblemStatement: false,
  hasValueProposition: false,
  hasCaseStudy: false,
  hasSocialProof: false,
  hasPersonalization: false,
};

const VALID_CTA_SUBTYPES = [
  "book_a_call",
  "reply_to_email",
  "visit_link",
  "download_resource",
] as const;

const BODY_ELEMENTS_PROMPT = `Analyze this cold email body and identify which structural elements are present.

Respond with ONLY valid JSON matching this exact schema:
{
  "hasCtaType": boolean,
  "ctaSubtype": "book_a_call" | "reply_to_email" | "visit_link" | "download_resource" | null,
  "hasProblemStatement": boolean,
  "hasValueProposition": boolean,
  "hasCaseStudy": boolean,
  "hasSocialProof": boolean,
  "hasPersonalization": boolean
}

Element definitions:
- CTA type: Any call-to-action asking the reader to take a specific action
  - book_a_call: Scheduling a meeting/call/demo
  - reply_to_email: Asking for a reply or response
  - visit_link: Clicking a link to a resource
  - download_resource: Downloading a PDF/guide/whitepaper
- Problem statement: Identifies a specific pain point or challenge the reader faces
- Value proposition: States a clear benefit or outcome the sender can deliver
- Case study: References a specific client result with numbers or named company
- Social proof: Mentions logos, client count, testimonials, awards, or industry recognition (broader than case study)
- Personalization: References something specific to the reader's company, role, industry, or recent activity

Email body:
{body}`;

/**
 * Classify an email body for structural elements using AI.
 * Returns element flags. Falls back to EMPTY_ELEMENTS on failure.
 */
export async function classifyBodyElements(
  emailBody: string,
): Promise<BodyElements> {
  if (!emailBody || emailBody.trim().length < 20) {
    return EMPTY_ELEMENTS;
  }

  const prompt = BODY_ELEMENTS_PROMPT.replace("{body}", emailBody);

  const result = await generateText({
    model: anthropic("claude-haiku-4-5-20250315"),
    prompt,
  });

  try {
    const parsed = JSON.parse(result.text.trim());
    return {
      hasCtaType: Boolean(parsed.hasCtaType),
      ctaSubtype: VALID_CTA_SUBTYPES.includes(parsed.ctaSubtype)
        ? parsed.ctaSubtype
        : null,
      hasProblemStatement: Boolean(parsed.hasProblemStatement),
      hasValueProposition: Boolean(parsed.hasValueProposition),
      hasCaseStudy: Boolean(parsed.hasCaseStudy),
      hasSocialProof: Boolean(parsed.hasSocialProof),
      hasPersonalization: Boolean(parsed.hasPersonalization),
    };
  } catch {
    console.error(
      "[body-elements] Failed to parse LLM response:",
      result.text,
    );
    return EMPTY_ELEMENTS;
  }
}

function bodyHash(body: string): string {
  return createHash("md5").update(body).digest("hex");
}

interface EmailSequenceStep {
  position: number;
  subjectLine?: string;
  subjectVariantB?: string;
  body?: string;
  delayDays?: number;
  notes?: string;
}

/**
 * Classify body elements for all campaign steps in a workspace.
 * Skips steps already classified with matching content hash.
 */
export async function classifyWorkspaceBodyElements(
  workspaceSlug: string,
): Promise<{ classified: number; skipped: number; errors: string[] }> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      workspaceSlug,
      emailSequence: { not: null },
    },
    select: {
      id: true,
      emailSequence: true,
    },
  });

  let classified = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const campaign of campaigns) {
    if (!campaign.emailSequence) continue;

    let steps: EmailSequenceStep[];
    try {
      steps = JSON.parse(campaign.emailSequence) as EmailSequenceStep[];
    } catch {
      errors.push(
        `Campaign ${campaign.id}: failed to parse emailSequence JSON`,
      );
      continue;
    }

    for (const step of steps) {
      if (!step.body) continue;

      const metricKey = `${campaign.id}:step:${step.position}`;
      const hash = bodyHash(step.body);

      try {
        // Check if already classified with same content hash
        const existing = await prisma.cachedMetrics.findUnique({
          where: {
            workspace_metricType_metricKey_date: {
              workspace: workspaceSlug,
              metricType: "body_elements",
              metricKey,
              date: "",
            },
          },
        });

        if (existing) {
          try {
            const existingData = JSON.parse(existing.data);
            if (existingData.bodyHash === hash) {
              skipped++;
              continue;
            }
          } catch {
            // Corrupted data -- re-classify
          }
        }

        const elements = await classifyBodyElements(step.body);

        await prisma.cachedMetrics.upsert({
          where: {
            workspace_metricType_metricKey_date: {
              workspace: workspaceSlug,
              metricType: "body_elements",
              metricKey,
              date: "",
            },
          },
          create: {
            workspace: workspaceSlug,
            metricType: "body_elements",
            metricKey,
            date: "",
            data: JSON.stringify({ ...elements, bodyHash: hash }),
          },
          update: {
            data: JSON.stringify({ ...elements, bodyHash: hash }),
            computedAt: new Date(),
          },
        });

        classified++;
      } catch (err) {
        errors.push(
          `Campaign ${campaign.id} step ${step.position}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  return { classified, skipped, errors };
}
