/**
 * AI Ark Search discovery adapter.
 *
 * Uses the AI Ark People Search API for bulk discovery by role, seniority,
 * department, location, and keywords. This is DISTINCT from aiark-person.ts
 * (which enriches individual people by LinkedIn URL). This adapter uses the
 * same endpoint with search/filter parameters for bulk discovery.
 *
 * Rate limits: 5 req/s, 300 req/min. The calling agent controls frequency;
 * this adapter throws { status: 429 } on rate limit for upstream retry.
 *
 * Auth: LOW CONFIDENCE — if 401/403, check docs.ai-ark.com and update
 * AUTH_HEADER_NAME below to match the actual header name.
 */

import { z } from "zod";
import type { DiscoveredPersonResult, DiscoveryAdapter, DiscoveryFilter, DiscoveryResult } from "../types";

const AIARK_PEOPLE_ENDPOINT = "https://api.ai-ark.com/api/developer-portal/v1/people";

/**
 * Auth header literal name for AI Ark API.
 * LOW CONFIDENCE — update if you get 401/403 responses.
 * Candidates: "X-TOKEN", "Authorization" (Bearer), "X-API-Key"
 */
const AUTH_HEADER_NAME = "X-TOKEN";

const REQUEST_TIMEOUT_MS = 15_000;

function getApiKey(): string {
  const key = process.env.AIARK_API_KEY;
  if (!key) {
    throw new Error("AIARK_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Loose validation for a single person record from AI Ark search results.
 * All fields optional — defensive against undocumented API changes.
 * MEDIUM confidence on field names (e.g., `title` vs `job_title`).
 */
const AiArkSearchPersonSchema = z
  .object({
    id: z.string().optional(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    linkedin_url: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    company_name: z.string().optional().nullable(),
    company_domain: z.string().optional().nullable(),
  })
  .passthrough();

/**
 * Loose validation for the AI Ark search response envelope.
 * Handles both root-array and data-envelope response shapes.
 */
const AiArkSearchResponseSchema = z
  .object({
    data: z.array(AiArkSearchPersonSchema).optional(),
    totalElements: z.number().optional(),
    totalPages: z.number().optional(),
    pageNumber: z.number().optional(),
    pageSize: z.number().optional(),
  })
  .passthrough();

type AiArkSearchPerson = z.infer<typeof AiArkSearchPersonSchema>;

/**
 * Build the AI Ark request body from DiscoveryFilter.
 * Field names are MEDIUM confidence — the mapping below follows the most common
 * REST convention for this API. Only non-empty filter fields are included.
 */
function buildRequestBody(
  filters: DiscoveryFilter,
  page: number,
  size: number,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    page,
    size,
  };

  if (filters.jobTitles?.length) {
    // Both `title` and `job_title` are plausible — using `title` to match enrichment adapter pattern
    body.title = filters.jobTitles;
  }

  if (filters.seniority?.length) {
    body.seniority = filters.seniority;
  }

  if (filters.locations?.length) {
    body.location = filters.locations;
  }

  if (filters.industries?.length) {
    body.industry = filters.industries;
  }

  if (filters.companySizes?.length) {
    // Both `company_size` and `employee_count` are plausible field names
    body.company_size = filters.companySizes;
  }

  if (filters.keywords?.length) {
    // Join keywords into a space-separated string; `keywords` and `q` are both plausible
    body.keywords = filters.keywords.join(" ");
  }

  if (filters.companyDomains?.length) {
    body.company_domain = filters.companyDomains;
  }

  return body;
}

function mapPerson(person: AiArkSearchPerson): DiscoveredPersonResult {
  return {
    firstName: person.first_name ?? undefined,
    lastName: person.last_name ?? undefined,
    jobTitle: person.title ?? undefined,
    linkedinUrl: person.linkedin_url ?? undefined,
    email: person.email ?? undefined,
    company: person.company_name ?? undefined,
    companyDomain: person.company_domain ?? undefined,
    location: person.location ?? undefined,
    sourceId: person.id,
  };
}

/**
 * Normalize raw API response to an array of person records.
 * Handles two shapes: root-level array or `{ data: [...] }` envelope.
 */
function extractPeople(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

/**
 * AI Ark Search discovery adapter.
 * Implements DiscoveryAdapter — searches people by role, seniority, location,
 * industry, keywords, and company domains with zero-based pagination.
 */
export class AiArkSearchAdapter implements DiscoveryAdapter {
  readonly name = "aiark";

  /**
   * Estimated cost per result: ~$0.003 per API call regardless of result count.
   * AI Ark charges per call, not per result.
   */
  readonly estimatedCostPerResult = 0.003;

  async search(
    filters: DiscoveryFilter,
    limit: number,
    pageToken?: string,
  ): Promise<DiscoveryResult> {
    const apiKey = getApiKey();

    // Page is zero-based; pageToken is a stringified integer
    const page = pageToken ? parseInt(pageToken, 10) : 0;
    const size = Math.min(limit, 100);

    const requestBody = buildRequestBody(filters, page, size);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let raw: unknown;

    try {
      const response = await fetch(AIARK_PEOPLE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [AUTH_HEADER_NAME]: apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401 || response.status === 403) {
        console.warn(
          `AI Ark search auth failed (${response.status}) — verify AUTH_HEADER_NAME in aiark-search.ts. ` +
            `Currently using "${AUTH_HEADER_NAME}". Check https://docs.ai-ark.com for the correct header name.`,
        );
        throw new Error(`AI Ark search auth error: HTTP ${response.status}`);
      }

      if (response.status === 429) {
        // Rate limit: 5 req/s, 300 req/min. Throw with status for upstream retry.
        throw Object.assign(new Error("AI Ark rate limit exceeded"), { status: 429 });
      }

      if (!response.ok) {
        throw Object.assign(
          new Error(`AI Ark search unexpected error: HTTP ${response.status}`),
          { status: response.status },
        );
      }

      raw = await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }

    // Extract pagination metadata from envelope (if present)
    const envelope = AiArkSearchResponseSchema.safeParse(raw);
    const totalElements = envelope.success ? (envelope.data.totalElements ?? 0) : 0;

    const rawPeople = extractPeople(raw);
    const people: DiscoveredPersonResult[] = rawPeople.flatMap((item) => {
      const parsed = AiArkSearchPersonSchema.safeParse(item);
      if (!parsed.success) {
        console.warn("AI Ark search: skipping invalid person record:", parsed.error.message);
        return [];
      }
      return [mapPerson(parsed.data)];
    });

    // Next page exists if we've fetched fewer total records than available
    const fetchedSoFar = (page + 1) * size;
    const hasMore = totalElements > 0 ? fetchedSoFar < totalElements : people.length === size;
    const nextPageToken = hasMore ? String(page + 1) : undefined;

    return {
      people,
      totalAvailable: totalElements || undefined,
      hasMore,
      nextPageToken,
      // Cost: one credit per API call regardless of results returned
      costUsd: 0.003,
      rawResponse: raw,
    };
  }
}

/** Singleton instance for use throughout the application. */
export const aiarkSearchAdapter = new AiArkSearchAdapter();
