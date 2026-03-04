/**
 * Staging helper — shared write path for all discovery adapters.
 *
 * All adapters produce DiscoveredPersonResult arrays. This module writes them
 * to the DiscoveredPerson table in batches, grouping records by a run ID for
 * later dedup and promotion (Phase 17).
 */
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import type { DiscoveredPersonResult } from "./types";

export interface StagingInput {
  /** Array of discovered people from a discovery adapter */
  people: DiscoveredPersonResult[];

  /** Discovery source identifier: "apollo" | "prospeo" | "serper" | "serper-maps" | "firecrawl" | "aiark" */
  discoverySource: string;

  /** Which workspace this discovery run belongs to */
  workspaceSlug: string;

  /** JSON-serialized filters or query text used to find these people */
  searchQuery?: string;

  /** Groups records from the same batch; auto-generated UUID if omitted */
  discoveryRunId?: string;

  /**
   * Per-person raw API response objects (parallel array to people).
   * If provided and same length as people, each is JSON-stringified into rawResponse.
   * If omitted or length mismatch, rawResponse is left null.
   */
  rawResponses?: unknown[];
}

export interface StagingResult {
  /** Number of records written to the database */
  staged: number;

  /** The run ID used to group this batch (auto-generated if not provided in input) */
  runId: string;
}

/**
 * Write a batch of DiscoveredPersonResult records to the DiscoveredPerson table.
 *
 * Deduplication is Phase 17's responsibility — this function writes all records
 * without filtering, using skipDuplicates: false intentionally.
 *
 * @param input - StagingInput with people array and provenance metadata
 * @returns Number of records staged and the run ID
 */
export async function stageDiscoveredPeople(
  input: StagingInput
): Promise<StagingResult> {
  const runId = input.discoveryRunId ?? randomUUID();
  const hasRawResponses =
    input.rawResponses !== undefined &&
    input.rawResponses.length === input.people.length;

  const records = input.people.map((person, i) => ({
    email: person.email ?? null,
    firstName: person.firstName ?? null,
    lastName: person.lastName ?? null,
    jobTitle: person.jobTitle ?? null,
    company: person.company ?? null,
    companyDomain: person.companyDomain ?? null,
    linkedinUrl: person.linkedinUrl ?? null,
    phone: person.phone ?? null,
    location: person.location ?? null,
    discoverySource: input.discoverySource,
    searchQuery: input.searchQuery ?? null,
    workspaceSlug: input.workspaceSlug,
    discoveryRunId: runId,
    rawResponse: hasRawResponses
      ? JSON.stringify(input.rawResponses![i])
      : null,
  }));

  const result = await prisma.discoveredPerson.createMany({
    data: records,
    skipDuplicates: false,
  });

  return { staged: result.count, runId };
}
