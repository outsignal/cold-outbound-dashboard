/**
 * Deduplication and promotion engine for discovered people.
 *
 * Checks staged DiscoveredPerson records against the Person DB using three match legs:
 *   1. Email exact match
 *   2. LinkedIn URL exact match
 *   3. Name + company fuzzy match (Levenshtein at 0.85 threshold)
 *
 * Non-duplicates are promoted to the Person table with a PersonWorkspace junction record.
 * Leads without email get a placeholder email so the unique constraint is satisfied.
 * Promoted leads are enqueued for full-waterfall enrichment via the EnrichmentJob queue.
 * Duplicate records are marked status='duplicate' with personId set (no promotedAt — duplicates are free for quota).
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { enqueueJob } from "@/lib/enrichment/queue";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PromotionResult {
  /** Number of DiscoveredPerson records promoted to Person table */
  promoted: number;
  /** Number of DiscoveredPerson records marked as duplicates */
  duplicates: number;
  /** Up to 5 sample names of duplicate records (for display) */
  duplicateNames: string[];
  /** Person IDs of newly promoted leads */
  promotedIds: string[];
  /** EnrichmentJob ID if enrichment was enqueued; undefined if no leads were promoted */
  enrichmentJobId?: string;
}

// ---------------------------------------------------------------------------
// String similarity (hand-rolled Levenshtein — no external dependency)
// ---------------------------------------------------------------------------

/**
 * Standard dynamic-programming Levenshtein distance.
 * Returns the edit distance between strings a and b.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Allocate a (m+1) x (n+1) matrix
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );

  // Base cases: transforming empty string to/from prefix
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Normalised string similarity: 1.0 = identical, 0.0 = completely different.
 * Based on Levenshtein distance divided by the length of the longer string.
 */
export function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0; // both empty strings are identical
  return 1 - levenshteinDistance(a, b) / maxLen;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** A DiscoveredPerson row as returned by Prisma (minimal fields needed for dedup). */
interface StagedRecord {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  company: string | null;
  companyDomain: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  location: string | null;
  discoverySource: string;
  workspaceSlug: string;
}

/**
 * Check whether an existing Person record matches a staged DiscoveredPerson.
 * Returns the matching Person's ID, or null if no match found.
 *
 * Three-leg matching:
 *   Leg 1: Email exact match (skips placeholder emails)
 *   Leg 2: LinkedIn URL exact match
 *   Leg 3: Full-name fuzzy match within same companyDomain (Levenshtein >= 0.85)
 */
async function findExistingPerson(dp: StagedRecord): Promise<string | null> {
  // Leg 1: Email exact match (skip placeholders and null)
  if (dp.email && !dp.email.includes("@discovery.internal")) {
    const match = await prisma.person.findUnique({
      where: { email: dp.email },
      select: { id: true },
    });
    if (match) return match.id;
  }

  // Leg 2: LinkedIn URL exact match
  if (dp.linkedinUrl) {
    const match = await prisma.person.findFirst({
      where: { linkedinUrl: dp.linkedinUrl },
      select: { id: true },
    });
    if (match) return match.id;
  }

  // Leg 3: Fuzzy name + companyDomain match
  // Only attempt when we have enough signal: firstName + lastName + companyDomain
  if (dp.firstName && dp.lastName && dp.companyDomain) {
    const candidateName = `${dp.firstName} ${dp.lastName}`.toLowerCase().trim();

    const candidates = await prisma.person.findMany({
      where: { companyDomain: dp.companyDomain },
      select: { id: true, firstName: true, lastName: true },
      take: 100,
    });

    for (const candidate of candidates) {
      if (!candidate.firstName || !candidate.lastName) continue;
      const existingName =
        `${candidate.firstName} ${candidate.lastName}`.toLowerCase().trim();
      const similarity = stringSimilarity(candidateName, existingName);
      if (similarity >= 0.85) {
        return candidate.id;
      }
    }
  }

  return null;
}

/**
 * Promote a staged DiscoveredPerson to the Person table.
 * Creates (or finds) the Person record and ensures a PersonWorkspace junction exists.
 * Returns the Person's ID.
 */
async function promoteToPerson(
  dp: StagedRecord,
  workspaceSlug: string
): Promise<{ id: string }> {
  // Use real email if available; otherwise generate a placeholder so the unique
  // constraint on Person.email is satisfied.
  const email =
    dp.email && !dp.email.includes("@discovery.internal")
      ? dp.email
      : `placeholder-${randomUUID()}@discovery.internal`;

  // Upsert Person — if the email already exists (race condition), use existing record.
  const person = await prisma.person.upsert({
    where: { email },
    create: {
      email,
      firstName: dp.firstName ?? null,
      lastName: dp.lastName ?? null,
      jobTitle: dp.jobTitle ?? null,
      company: dp.company ?? null,
      companyDomain: dp.companyDomain ?? null,
      linkedinUrl: dp.linkedinUrl ?? null,
      phone: dp.phone ?? null,
      location: dp.location ?? null,
      source: `discovery-${dp.discoverySource}`,
      status: "new",
    },
    update: {},
    select: { id: true },
  });

  // Upsert PersonWorkspace junction — idempotent
  await prisma.personWorkspace.upsert({
    where: {
      personId_workspace: {
        personId: person.id,
        workspace: workspaceSlug,
      },
    },
    create: {
      personId: person.id,
      workspace: workspaceSlug,
    },
    update: {},
  });

  return person;
}

/**
 * Enqueue a full-waterfall enrichment job for the given Person IDs.
 * Returns the EnrichmentJob ID.
 */
async function triggerEnrichmentForPeople(
  personIds: string[],
  workspaceSlug: string
): Promise<string | undefined> {
  if (personIds.length === 0) return undefined;

  const jobId = await enqueueJob({
    entityType: "person",
    provider: "waterfall",
    entityIds: personIds,
    chunkSize: 25,
    workspaceSlug,
  });

  return jobId;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Deduplicates and promotes staged DiscoveredPerson records to the Person table.
 *
 * Fetches all records with status='staged' for the given workspace and run IDs,
 * runs three-leg dedup against existing Person records, promotes non-duplicates,
 * and enqueues enrichment for promoted leads.
 *
 * @param workspaceSlug - The workspace these records belong to
 * @param runIds - Discovery run IDs to process (filters staged records)
 * @returns PromotionResult with counts, sample duplicate names, promoted IDs, and job ID
 */
export async function deduplicateAndPromote(
  workspaceSlug: string,
  runIds: string[]
): Promise<PromotionResult> {
  // Fetch all staged records for these run IDs
  const staged = await prisma.discoveredPerson.findMany({
    where: {
      workspaceSlug,
      status: "staged",
      discoveryRunId: { in: runIds },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      company: true,
      companyDomain: true,
      linkedinUrl: true,
      phone: true,
      location: true,
      discoverySource: true,
      workspaceSlug: true,
    },
  });

  const promotedIds: string[] = [];
  const duplicatePersonIds: string[] = [];
  const duplicateNames: string[] = [];
  const now = new Date();

  for (const dp of staged) {
    const existingPersonId = await findExistingPerson(dp);

    if (existingPersonId) {
      // Duplicate — mark as duplicate, set personId, do NOT set promotedAt (free for quota)
      await prisma.discoveredPerson.update({
        where: { id: dp.id },
        data: {
          status: "duplicate",
          personId: existingPersonId,
          // promotedAt intentionally left null — duplicates don't count against quota
        },
      });

      duplicatePersonIds.push(existingPersonId);

      // Collect sample name for display (up to 5)
      if (duplicateNames.length < 5) {
        const displayName =
          dp.firstName && dp.lastName
            ? `${dp.firstName} ${dp.lastName}`
            : dp.email ?? dp.id;
        duplicateNames.push(displayName);
      }
    } else {
      // Not a duplicate — promote to Person table
      const person = await promoteToPerson(dp, workspaceSlug);

      // Update DiscoveredPerson record with promotion details
      await prisma.discoveredPerson.update({
        where: { id: dp.id },
        data: {
          status: "promoted",
          personId: person.id,
          promotedAt: now,
        },
      });

      promotedIds.push(person.id);
    }
  }

  // Enqueue enrichment for all newly promoted leads
  const enrichmentJobId = await triggerEnrichmentForPeople(
    promotedIds,
    workspaceSlug
  );

  return {
    promoted: promotedIds.length,
    duplicates: duplicatePersonIds.length,
    duplicateNames,
    promotedIds,
    enrichmentJobId,
  };
}
