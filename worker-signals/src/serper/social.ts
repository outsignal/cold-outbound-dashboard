// Serper social listening adapter — competitor mention detection on Reddit + Twitter.
//
// Cannot import from the main Next.js app (different package/build context).
// Reimplements the minimal searchSocial logic with competitor frustration keyword strategy.
//
// searchCompetitorMentions — searches Reddit + Twitter for frustration signals around
//   competitor names, deduplicates via SeenSignalUrl, returns SignalInput records.

import { isSeenUrl, markUrlSeen } from "../dedup.js";
import type { SignalInput } from "../types.js";

const SERPER_API_URL = "https://google.serper.dev/search";
const SERPER_COST_PER_CALL = 0.001; // $0.001 per Serper search

interface SerperWebResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperSearchResponse {
  organic?: SerperWebResult[];
}

/**
 * Perform a single Serper search query and return organic results.
 * Uses the Google Serper API with the X-API-KEY header.
 *
 * @param query    - Full search query string
 * @param platform - "reddit" or "twitter" (used for site: prefix)
 * @returns Results and cost
 */
async function searchSocial(
  query: string,
  platform: "reddit" | "twitter",
): Promise<{ results: SerperWebResult[]; costUsd: number }> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.warn("[Serper] SERPER_API_KEY not set — skipping social search");
    return { results: [], costUsd: 0 };
  }

  const sitePrefix = platform === "reddit" ? "site:reddit.com" : "site:twitter.com";
  const fullQuery = `${sitePrefix} ${query}`;

  let response: Response;
  try {
    response = await fetch(SERPER_API_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: fullQuery,
        type: "search",
        num: 10,
      }),
    });
  } catch (error) {
    console.error(`[Serper] Network error searching for "${query}" on ${platform}:`, error);
    return { results: [], costUsd: 0 };
  }

  if (!response.ok) {
    console.warn(`[Serper] HTTP ${response.status} searching for "${query}" on ${platform}`);
    return { results: [], costUsd: SERPER_COST_PER_CALL }; // Still charge — API was called
  }

  let body: SerperSearchResponse;
  try {
    body = (await response.json()) as SerperSearchResponse;
  } catch {
    console.warn(`[Serper] Failed to parse response for "${query}" on ${platform}`);
    return { results: [], costUsd: SERPER_COST_PER_CALL };
  }

  const results: SerperWebResult[] = (body.organic ?? []).map((r) => ({
    title: r.title ?? "",
    link: r.link ?? "",
    snippet: r.snippet ?? "",
    position: r.position ?? 0,
  }));

  return { results, costUsd: SERPER_COST_PER_CALL };
}

// ---------------------------------------------------------------------------
// searchCompetitorMentions
// ---------------------------------------------------------------------------

/**
 * Search Reddit and Twitter for competitor mentions with frustration keywords.
 * Deduplicates URLs via SeenSignalUrl so the same post is not re-processed across cycles.
 *
 * Strategy: for each competitor, searches for posts containing:
 *   "{competitor}" ("switching from" OR "alternative to" OR "frustrated with" OR "looking for replacement")
 *
 * @param competitors - Array of competitor brand names (from workspace.signalCompetitors)
 * @param platforms   - Which platforms to search (default: ["reddit", "twitter"])
 * @returns Array of SignalInput records for all unseen competitor mention results
 */
export async function searchCompetitorMentions(
  competitors: string[],
  platforms: ("reddit" | "twitter")[] = ["reddit", "twitter"],
): Promise<{ signals: SignalInput[]; totalCostUsd: number }> {
  if (competitors.length === 0) {
    return { signals: [], totalCostUsd: 0 };
  }

  const signals: SignalInput[] = [];
  let totalCostUsd = 0;

  for (const competitor of competitors) {
    const query = `"${competitor}" ("switching from" OR "alternative to" OR "frustrated with" OR "looking for replacement")`;

    for (const platform of platforms) {
      const { results, costUsd } = await searchSocial(query, platform);
      totalCostUsd += costUsd;

      for (const result of results) {
        if (!result.link) continue;

        // Skip if already seen in a previous cycle
        const alreadySeen = await isSeenUrl(result.link);
        if (alreadySeen) continue;

        // Mark as seen before adding to output — prevents duplicate processing
        // even if called multiple times in the same run
        await markUrlSeen(result.link);

        signals.push({
          signalType: "social_mention",
          source: "serper",
          externalId: null, // Social mentions have no stable external ID
          companyDomain: "", // No specific domain — social mentions are competitor-level
          title: result.title,
          summary: result.snippet,
          sourceUrl: result.link,
          rawResponse: JSON.stringify(result),
          metadata: JSON.stringify({
            competitor,
            platform,
            position: result.position,
            query,
          }),
        });
      }
    }
  }

  return { signals, totalCostUsd };
}
