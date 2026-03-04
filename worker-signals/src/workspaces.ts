// Workspace signal configuration loader.
// Loads all active workspaces that have at least one signal type enabled.
// Provides domain deduplication for the fan-out pattern in cycle.ts.
//
// loadWorkspaceConfigs   — query all active, signal-enabled workspaces once per cycle.
// buildDomainWorkspaceMap — deduplicate domains across workspaces for single-poll fan-out.

import { prisma } from "./db.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkspaceSignalConfig {
  slug: string;
  name: string;
  signalDailyCapUsd: number;
  enabledTypes: string[]; // Parsed from signalEnabledTypes JSON
  competitors: string[];  // Parsed from signalCompetitors JSON
  watchlistDomains: string[]; // Parsed from signalWatchlistDomains JSON
  slackChannelId: string | null;
}

export interface DomainWorkspaceInfo {
  /** All workspace slugs that have this domain in their watchlist */
  workspaceSlugs: string[];
  /**
   * Per-workspace enabled signal types.
   * Map key = workspaceSlug, value = signal type strings for that workspace.
   */
  enabledTypes: Map<string, string[]>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJsonArray(jsonStr: string | null | undefined, fieldName: string): string[] {
  if (!jsonStr || jsonStr.trim() === "") return [];
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    console.warn(`[Workspaces] Failed to parse ${fieldName} JSON: "${jsonStr}"`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// loadWorkspaceConfigs
// ---------------------------------------------------------------------------

/**
 * Load all active workspaces that have signal monitoring configured.
 *
 * Filters to workspaces where:
 * - status = "active"
 * - signalEnabledTypes is not empty (i.e., not "[]")
 *
 * @returns Array of WorkspaceSignalConfig, ready for use by the cycle orchestrator
 */
export async function loadWorkspaceConfigs(): Promise<WorkspaceSignalConfig[]> {
  const workspaces = await prisma.workspace.findMany({
    where: {
      status: "active",
      NOT: {
        signalEnabledTypes: "[]",
      },
    },
    select: {
      slug: true,
      name: true,
      signalDailyCapUsd: true,
      signalEnabledTypes: true,
      signalCompetitors: true,
      signalWatchlistDomains: true,
      slackChannelId: true,
    },
  });

  type WorkspaceRow = (typeof workspaces)[number];
  return workspaces.map((ws: WorkspaceRow) => ({
    slug: ws.slug,
    name: ws.name,
    signalDailyCapUsd: ws.signalDailyCapUsd,
    enabledTypes: parseJsonArray(ws.signalEnabledTypes, `${ws.slug}.signalEnabledTypes`),
    competitors: parseJsonArray(ws.signalCompetitors, `${ws.slug}.signalCompetitors`),
    watchlistDomains: parseJsonArray(ws.signalWatchlistDomains, `${ws.slug}.signalWatchlistDomains`),
    slackChannelId: ws.slackChannelId ?? null,
  }));
}

// ---------------------------------------------------------------------------
// buildDomainWorkspaceMap
// ---------------------------------------------------------------------------

/**
 * Build a deduplicated map of domain -> workspaces for the fan-out pattern.
 *
 * Each unique domain appears exactly once in the map. PredictLeads is called
 * once per domain, and signals are fanned out to all workspaces watching it.
 *
 * @param configs - Array from loadWorkspaceConfigs()
 * @returns Map from domain string to DomainWorkspaceInfo
 */
export function buildDomainWorkspaceMap(
  configs: WorkspaceSignalConfig[],
): Map<string, DomainWorkspaceInfo> {
  const domainMap = new Map<string, DomainWorkspaceInfo>();

  for (const ws of configs) {
    for (const domain of ws.watchlistDomains) {
      if (!domain.trim()) continue; // Skip blank entries

      const existing = domainMap.get(domain);
      if (existing) {
        // Domain already in map — add this workspace to the fan-out list
        existing.workspaceSlugs.push(ws.slug);
        existing.enabledTypes.set(ws.slug, ws.enabledTypes);
      } else {
        // First workspace watching this domain
        const info: DomainWorkspaceInfo = {
          workspaceSlugs: [ws.slug],
          enabledTypes: new Map([[ws.slug, ws.enabledTypes]]),
        };
        domainMap.set(domain, info);
      }
    }
  }

  return domainMap;
}
