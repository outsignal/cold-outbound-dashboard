import { prisma } from "@/lib/db";
import type { InsightGeneration } from "./types";

/**
 * Build a deterministic dedup key from category, action type, and target entity.
 * Used to detect re-generation of previously dismissed insights within the 2-week window.
 */
export function buildDedupKey(
  category: string,
  actionType: string,
  targetEntityId: string,
): string {
  return `${category}:${actionType}:${targetEntityId}`;
}

/**
 * Filter out insights whose dedupKey matches a dismissed insight within the last 14 days.
 * Returns only insights that should be persisted.
 */
export async function filterDuplicates(
  insights: InsightGeneration["insights"],
  workspaceSlug: string,
): Promise<InsightGeneration["insights"]> {
  if (insights.length === 0) return [];

  // Build dedup keys for all candidate insights
  const keysMap = new Map<string, (typeof insights)[number]>();
  for (const insight of insights) {
    const entityId =
      insight.suggestedAction.params?.campaignId ??
      insight.suggestedAction.params?.campaignName ??
      "global";
    const key = buildDedupKey(
      insight.category,
      insight.suggestedAction.type,
      entityId,
    );
    keysMap.set(key, insight);
  }

  const candidateKeys = Array.from(keysMap.keys());

  // Find dismissed insights with matching keys within the last 14 days
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const dismissed = await prisma.insight.findMany({
    where: {
      workspaceSlug,
      dedupKey: { in: candidateKeys },
      status: "dismissed",
      resolvedAt: { gte: twoWeeksAgo },
    },
    select: { dedupKey: true },
  });

  const dismissedKeys = new Set(dismissed.map((d) => d.dedupKey));

  // Return insights whose keys were NOT recently dismissed
  return insights.filter((insight) => {
    const entityId =
      insight.suggestedAction.params?.campaignId ??
      insight.suggestedAction.params?.campaignName ??
      "global";
    const key = buildDedupKey(
      insight.category,
      insight.suggestedAction.type,
      entityId,
    );
    return !dismissedKeys.has(key);
  });
}
