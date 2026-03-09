import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { prisma } from "@/lib/db";

const VALID_STRATEGIES = [
  "creative-ideas",
  "pvp",
  "one-liner",
  "custom",
] as const;

type CopyStrategy = (typeof VALID_STRATEGIES)[number];

const STRATEGY_DETECT_PROMPT = `Classify this cold email into one of these copy strategies:
- "creative-ideas": Opens with creative/unconventional ideas related to the prospect's business
- "pvp": Problem-Value-Proof structure (states a problem, offers value, provides proof/social proof)
- "one-liner": Ultra-short (1-3 sentences), direct ask with minimal preamble

Respond with ONLY the strategy name. If none match clearly, respond "custom".

Email body:
{body}`;

/**
 * Detect the copy strategy of an email body using AI classification.
 * Returns one of: "creative-ideas", "pvp", "one-liner", "custom"
 */
export async function detectCopyStrategy(
  emailBody: string,
): Promise<CopyStrategy> {
  const prompt = STRATEGY_DETECT_PROMPT.replace("{body}", emailBody);

  const result = await generateText({
    model: anthropic("claude-haiku-4-5-20250315"),
    prompt,
  });

  const raw = result.text.trim().toLowerCase();

  // Validate against known strategies
  if (VALID_STRATEGIES.includes(raw as CopyStrategy)) {
    return raw as CopyStrategy;
  }

  // Try partial match for robustness
  for (const strategy of VALID_STRATEGIES) {
    if (raw.includes(strategy)) {
      return strategy;
    }
  }

  return "custom";
}

/**
 * Backfill copyStrategy for campaigns that have null copyStrategy and have email sequence data.
 * Returns count of updated campaigns.
 */
export async function backfillCopyStrategies(
  workspaceSlug: string,
): Promise<number> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      workspaceSlug,
      copyStrategy: null,
      emailSequence: { not: null },
    },
    select: {
      id: true,
      emailSequence: true,
    },
  });

  let updated = 0;

  for (const campaign of campaigns) {
    if (!campaign.emailSequence) continue;

    try {
      const steps = JSON.parse(campaign.emailSequence) as Array<{
        position: number;
        body?: string;
      }>;

      // Use the first step's body for classification
      const firstStep = steps.find((s) => s.position === 1) ?? steps[0];
      if (!firstStep?.body) continue;

      const strategy = await detectCopyStrategy(firstStep.body);

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { copyStrategy: strategy },
      });

      updated++;
    } catch (err) {
      console.error(
        `[strategy-detect] Failed to classify campaign ${campaign.id}:`,
        err,
      );
      // Continue to next campaign — non-blocking
    }
  }

  return updated;
}
