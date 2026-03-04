# Phase 16: Discovery Sources - Research

**Researched:** 2026-03-04
**Domain:** External API adapters for lead discovery (Apollo, Prospeo Search, AI Ark Search, Serper.dev, Firecrawl)
**Confidence:** MEDIUM — Apollo and AI Ark filter parameters partially confirmed; Serper Maps endpoint confirmed via multiple sources; Firecrawl extract API confirmed; AI Ark People Search API confirmed with HIGH confidence from official docs

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Store everything the source returns — missing fields stay null, enrichment fills gaps later
- Each DiscoveredPerson record tracks source name (e.g., 'apollo') and raw API response in a JSON column for debugging and cost auditing
- Separate DiscoveredPerson rows per source — no cross-source merging at adapter level. Dedup happens in Phase 17 at promotion time
- Store raw field values (job titles, company names) exactly as returned by the API — normalization happens during promotion to Person table
- Agent controls pagination: adapter returns one page + cursor, agent decides whether to fetch more based on quota and result quality
- Each adapter call returns a credit/cost estimate alongside results for the Phase 17 discovery plan
- Agent decides query strategy per search — directory-style queries OR company research queries based on ICP
- Google Maps results stored as company-level records, not people — agent may scrape company website for a generic contact email when no person data is available
- Reddit/Twitter social mentions are signal data, not contact records — passed to Phase 18's SignalEvent system
- Single SerperAdapter with multiple methods: .searchWeb(), .searchMaps(), .searchSocial() — agent picks the right method
- Two URL paths for Firecrawl: agent finds directory URLs via Serper, OR admin provides URLs directly in chat
- Fixed extraction schema mapping to DiscoveredPerson fields (name, email, title, company, phone, LinkedIn) — no adaptive schemas
- Single page extraction only for now — admin can provide multiple URLs for multi-page directories
- Basic validation on extraction results — filter obvious junk (emails that aren't emails, garbage names)
- ALL sources use shared Outsignal platform-level API keys stored in environment variables
- Apollo included as shared key — single Outsignal account, overrides DISC-09 per-workspace requirement
- Keys: APOLLO_API_KEY, PROSPEO_API_KEY, AIARK_API_KEY, SERPER_API_KEY, FIRECRAWL_API_KEY

### Claude's Discretion

- Error handling and retry strategy per adapter (transient vs permanent failures)
- Exact DiscoveredPerson field mapping per source
- Firecrawl extraction prompt engineering
- Rate limiting implementation

### Deferred Ideas (OUT OF SCOPE)

- Multi-page Firecrawl crawling (pagination, A-Z indexes) — future enhancement
- DISC-09 per-workspace Apollo keys — overridden by shared key decision, remove from requirements or mark as won't-do
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISC-01 | Leads Agent can search Apollo People API by title, seniority, industry, location, and company size and receive paginated contact records | Apollo adapter: POST /api/v1/mixed_people/api_search, filter params confirmed (person_titles, person_seniorities, organization_num_employees_ranges, person_locations). No emails returned — Phase 16 stores identity fields + sourceId for Phase 17 enrichment. |
| DISC-02 | Leads Agent can search Prospeo Search Person API with filters including funding stage and headcount and receive paginated contact records | Prospeo adapter: POST /search-person, X-KEY auth. Confirmed company_funding, company_headcount_range, person_seniority, person_job_title, person_location. 25 results/page, cursor via page param. 1 credit per request. |
| DISC-03 | Leads Agent can search AI Ark People Search API by role, seniority, department, location, keywords | AI Ark adapter: POST /api/developer-portal/v1/people, X-TOKEN auth (confirmed from docs). page+size pagination (zero-based). Rate limit: 5 req/s. Response includes contact details per record. |
| DISC-04 | Leads Agent can search Serper.dev for Google web results, Maps results, and social mentions (Reddit/Twitter) via natural language queries | SerperAdapter with .searchWeb(), .searchMaps(), .searchSocial(). Endpoint: POST https://google.serper.dev/search, X-API-KEY header. Maps/places via type='places', social via site:reddit.com or site:twitter.com in query. |
| DISC-05 | Leads Agent can scrape custom directories via Firecrawl /extract endpoint with structured JSON schema | FirecrawlDirectoryAdapter using existing @mendable/firecrawl-js SDK (v4.13.2). extract() API already confirmed in codebase (firecrawl-company.ts). Fixed schema for DiscoveredPerson fields + basic validation. |
</phase_requirements>

---

## Summary

Phase 16 wires up five concrete DiscoveryAdapter implementations against the interface contract established in Phase 15. The DiscoveredPerson table and DiscoveryAdapter interface are already in place. The Firecrawl SDK is already installed and used. This phase is pure adapter implementation work: no new schema changes required, no new dependencies needed (except possibly a small Serper utility if desired, but raw fetch is fine).

The most important architectural insight: Apollo does not return emails in search results — only identity data (name, title, company, LinkedIn, location) plus a person_id. This is by design. Phase 16 adapters write what each source returns; Phase 17 orchestration handles enrichment. The DiscoveredPerson staging table was designed exactly for this: identity data + sourceId + rawResponse + discoverySource.

The AI Ark People Search endpoint (`/api/developer-portal/v1/people`) is CONFIRMED from the official docs at docs.ai-ark.com — the same base URL used in the existing aiark.ts and aiark-person.ts enrichment adapters. The auth header `X-TOKEN` is LOW confidence (same caveat as existing enrichment adapters). This resolves the STATE.md blocker: "verify in AI Ark dashboard before Phase 16 implementation."

**Primary recommendation:** Implement all five adapters as standalone TypeScript files under `src/lib/discovery/adapters/`. Each adapter implements the DiscoveryAdapter interface from types.ts. Add a thin `stageDiscoveredPeople()` helper in `src/lib/discovery/staging.ts` for the shared write-to-DB logic. Wire discovery tools into the Leads Agent in leads.ts.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^4.3.6 (project) | Request/response validation | Already used by all enrichment adapters and agents |
| @prisma/client | ^6.19.2 | Write to DiscoveredPerson table | Already used throughout |
| @mendable/firecrawl-js | ^4.13.2 | Firecrawl extract() | Already installed and used in firecrawl-company.ts |
| ai / @ai-sdk/anthropic | ^6.0.97 / ^3.0.46 | Tool definitions for Leads Agent | Already used in leads.ts |
| fetch (Node built-in) | Node 18+ | HTTP calls to Apollo, Prospeo, AI Ark, Serper | Used by all existing enrichment adapters |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| AbortController | Node built-in | Request timeouts | Use same 10-15s timeout pattern as existing enrichment adapters |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| raw fetch | axios / node-fetch | raw fetch is already the project pattern — no reason to add axios |
| inline zod schemas | pre-built openapi parsers | overkill for known stable response shapes |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/lib/discovery/
├── types.ts                    # ALREADY EXISTS — DiscoveryAdapter, DiscoveryFilter, DiscoveryResult
├── staging.ts                  # NEW — stageDiscoveredPeople() writes batch to DiscoveredPerson table
└── adapters/
    ├── apollo.ts               # NEW — ApolloAdapter
    ├── prospeo-search.ts       # NEW — ProspeoSearchAdapter (distinct from prospeo enrichment adapter)
    ├── aiark-search.ts         # NEW — AiArkSearchAdapter
    ├── serper.ts               # NEW — SerperAdapter (.searchWeb, .searchMaps, .searchSocial)
    └── firecrawl-directory.ts  # NEW — FirecrawlDirectoryAdapter
```

Note: `prospeo-search.ts` is DISTINCT from `src/lib/enrichment/providers/prospeo.ts` (email enrichment). Prospeo has two different APIs: `/enrich-person` for email lookup and `/search-person` for lead discovery.

### Pattern 1: DiscoveryAdapter Implementation (existing interface)

**What:** Each adapter file exports a class or object implementing DiscoveryAdapter from types.ts.
**When to use:** For all five sources — same interface, different implementations.
**Example:**

```typescript
// Source: src/lib/discovery/types.ts (Phase 15)
import type { DiscoveryAdapter, DiscoveryFilter, DiscoveryResult } from "../types";

export class ApolloAdapter implements DiscoveryAdapter {
  readonly name = "apollo";
  readonly estimatedCostPerResult = 0; // Apollo search is free (no credits consumed)

  async search(
    filters: DiscoveryFilter,
    limit: number,
    pageToken?: string,
  ): Promise<DiscoveryResult> {
    // Build Apollo-specific request from DiscoveryFilter
    // Return DiscoveryResult with people array, hasMore, nextPageToken, costUsd, rawResponse
  }
}

export const apolloAdapter = new ApolloAdapter();
```

### Pattern 2: Staging helper (shared write-to-DB logic)

**What:** A single `stageDiscoveredPeople()` function handles all writes to DiscoveredPerson.
**When to use:** Called by agent tools after each adapter search, not inside the adapters themselves.
**Why:** Keeps adapters pure (no DB dependency) and testable. Agent tools control the write.

```typescript
// src/lib/discovery/staging.ts
import { prisma } from "@/lib/db";
import type { DiscoveredPersonResult } from "./types";

export interface StagingInput {
  people: DiscoveredPersonResult[];
  discoverySource: string;           // "apollo" | "prospeo" | "serper" | "firecrawl" | "aiark"
  workspaceSlug: string;
  searchQuery?: string;              // JSON-serialized filters or query string
  discoveryRunId?: string;           // Group records from same batch
  rawResponse?: unknown;             // Full raw API response for audit
}

export async function stageDiscoveredPeople(input: StagingInput): Promise<{ staged: number }> {
  const records = input.people.map((p) => ({
    email: p.email ?? null,
    firstName: p.firstName ?? null,
    lastName: p.lastName ?? null,
    jobTitle: p.jobTitle ?? null,
    company: p.company ?? null,
    companyDomain: p.companyDomain ?? null,
    linkedinUrl: p.linkedinUrl ?? null,
    phone: p.phone ?? null,
    location: p.location ?? null,
    discoverySource: input.discoverySource,
    searchQuery: input.searchQuery ?? null,
    workspaceSlug: input.workspaceSlug,
    discoveryRunId: input.discoveryRunId ?? null,
    // rawResponse stored per-person with their source record
  }));

  const result = await prisma.discoveredPerson.createMany({
    data: records,
    skipDuplicates: false, // Stage all — dedup is Phase 17's job
  });

  return { staged: result.count };
}
```

**Note on rawResponse per record vs per batch:** The DiscoveredPerson schema has no `rawResponse` column. The raw API response should be stored at the search query level or logged separately. For Phase 16, include rawResponse in the tool output returned to the agent — Phase 17 can log it in a DiscoveryRun model if needed. CONTEXT.md says "raw API response in a JSON column for debugging" — this needs a column added or stored per-record in a JSON field. See Open Questions.

### Pattern 3: Leads Agent discovery tools

**What:** New tools in leads.ts delegate to adapters and staging.
**When to use:** Agent invokes these tools based on ICP requirements.

```typescript
// In leads.ts — new tools added to leadsTools
searchApollo: tool({
  description: "Search Apollo.io for people matching ICP filters...",
  inputSchema: z.object({
    workspaceSlug: z.string(),
    jobTitles: z.array(z.string()).optional(),
    seniority: z.array(z.string()).optional(),
    industries: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    companySizes: z.array(z.string()).optional(),
    limit: z.number().default(25),
    pageToken: z.string().optional(),
  }),
  execute: async (params) => {
    const result = await apolloAdapter.search(/* ... */);
    const staged = await stageDiscoveredPeople({ people: result.people, ... });
    return { count: result.people.length, staged: staged.staged, hasMore: result.hasMore, ... };
  },
}),
```

### Anti-Patterns to Avoid

- **Writing directly to Person table from adapters:** Adapters ONLY write to DiscoveredPerson (staged). The Person table is Phase 17's concern.
- **Cross-source merging in adapters:** Each source produces its own rows. No dedup at this layer.
- **Normalizing field values at adapter time:** Store raw values (e.g., "Head of Engineering" not "engineering_head"). Normalization happens at promotion.
- **Tight-coupling DB writes inside adapter classes:** Adapters should be pure API clients. DB writes happen in staging.ts via agent tools.
- **Storing emails when source doesn't provide them:** Apollo search does not return emails. Don't call People Enrichment API in Phase 16 — that's Phase 17.

---

## API Reference Per Source

### Apollo (DISC-01)

**Endpoint:** `POST https://api.apollo.io/api/v1/mixed_people/api_search`
**Auth:** `x-api-key: {APOLLO_API_KEY}` header (or Bearer token)
**Credits:** Zero — search does NOT consume Apollo credits (HIGH confidence, per docs)
**Returns emails:** NO — only identity fields. Email requires separate People Enrichment call.

**Key filter parameters (MEDIUM confidence — verified via WebSearch from official docs):**
```json
{
  "person_titles": ["CTO", "VP Engineering"],
  "person_seniorities": ["c_suite", "vp", "director", "manager", "senior"],
  "organization_industry_tag_ids": [], // industry tag IDs (requires lookup or string-based approach)
  "organization_num_employees_ranges": ["11,50", "51,200", "201,500"],
  "person_locations": ["New York, United States"],
  "organization_locations": ["United Kingdom"],
  "per_page": 25,
  "page": 1
}
```

**Seniority values (HIGH confidence):** `owner`, `founder`, `c_suite`, `partner`, `vp`, `head`, `director`, `manager`, `senior`, `entry`, `intern`

**Employee ranges format (HIGH confidence):** Comma-separated pairs, e.g., `"1,10"`, `"11,50"`, `"51,200"`, `"201,500"`, `"501,1000"`, `"10000,20000"`

**Response (MEDIUM confidence):**
```json
{
  "people": [
    {
      "id": "...",
      "first_name": "Jane",
      "last_name": "...",
      "title": "CTO",
      "linkedin_url": "https://linkedin.com/in/...",
      "city": "...",
      "state": "...",
      "country": "...",
      "organization_name": "Acme Corp",
      "organization": { "name": "...", "industry": "...", "estimated_num_employees": 150 }
    }
  ],
  "total_entries": 12400,
  "pagination": { "page": 1, "per_page": 25 }
}
```

**Pagination:** `page` int, `per_page` int (max 100). Return `page + 1` as nextPageToken.

**DiscoveredPerson mapping:**
- `firstName` ← `person.first_name`
- `lastName` ← `person.last_name` (may be obfuscated in free tier)
- `jobTitle` ← `person.title`
- `linkedinUrl` ← `person.linkedin_url`
- `company` ← `person.organization_name`
- `location` ← `${person.city}, ${person.country}`
- `sourceId` ← `person.id`

**Note on industry filtering:** Apollo uses internal `organization_industry_tag_ids`. The string-based approach (passing industry names) may not work. Consider using `q_organization_industry_tag_ids` or passing industry as keyword. Verify in Apollo dashboard or accept string-based `keywords` as fallback. This is LOW confidence — requires testing.

---

### Prospeo Search (DISC-02)

**Endpoint:** `POST https://api.prospeo.io/search-person`
**Auth:** `X-KEY: {PROSPEO_API_KEY}` header (HIGH confidence — same as existing prospeo.ts adapter)
**Credits:** 1 credit per request that returns ≥1 result (HIGH confidence, per official docs)
**Returns emails:** NO — returns `person_id` for later enrichment via `/enrich-person`

**Key filter parameters (HIGH confidence from official docs):**
```json
{
  "person_job_title": { "include": ["CTO", "VP Engineering"] },
  "person_seniority": { "include": ["c_suite", "vp", "director"] },
  "person_department": { "include": ["engineering", "product"] },
  "person_location": { "include": ["United Kingdom"] },
  "company_industry": { "include": ["software"] },
  "company_headcount_range": { "include": ["51-200", "201-500"] },
  "company_funding": { "include": ["series_a", "series_b"] },
  "company_location": { "include": ["United Kingdom"] },
  "page": 1
}
```

**Filter format:** `include`/`exclude` arrays on each filter key. Exact enum values for headcount_range and funding must match dashboard — use strings like `"51-200"`, `"series_a"`. Confirm exact enum values in Prospeo dashboard before implementation.

**Pagination:** `page` param, 25 results/page, max 25,000 results (1,000 pages). Response includes `pagination.total_count`, `pagination.total_page`.

**Response shape (HIGH confidence):**
```json
{
  "error": false,
  "results": [
    {
      "person": {
        "person_id": "...",
        "first_name": "...",
        "last_name": "...",
        "job_title": "...",
        "seniority": "...",
        "linkedin_url": "...",
        "location": "..."
      },
      "company": {
        "name": "...",
        "domain": "...",
        "industry": "...",
        "headcount_range": "..."
      }
    }
  ],
  "pagination": { "current_page": 1, "per_page": 25, "total_page": 100, "total_count": 2500 }
}
```

**DiscoveredPerson mapping:**
- `firstName` ← `person.first_name`
- `lastName` ← `person.last_name`
- `jobTitle` ← `person.job_title`
- `linkedinUrl` ← `person.linkedin_url`
- `location` ← `person.location`
- `company` ← `company.name`
- `companyDomain` ← `company.domain`
- `sourceId` ← `person.person_id`

**Cost estimate:** `estimatedCostPerResult = PROSPEO_SEARCH_CREDIT_COST / 25` (1 credit = $X / 25 results per page)

---

### AI Ark Search (DISC-03)

**Endpoint:** `POST https://api.ai-ark.com/api/developer-portal/v1/people`
**Auth:** `X-TOKEN: {AIARK_API_KEY}` header (LOW confidence — same caveat as existing aiark.ts)
**Pagination:** `page` (zero-based int) + `size` (0-100, both REQUIRED)
**Rate limit:** 5 req/s, 300/min, 18,000/hr (HIGH confidence from docs)

**Key filter parameters (HIGH confidence from docs.ai-ark.com):**
The AI Ark People Search API supports deeply nested filters. The existing aiark-person.ts uses a simple `{ linkedin_url }` or `{ first_name, last_name, company }` body — the search endpoint uses a richer filter model.

Based on docs, the request body uses filter objects for:
- Seniority level, department, function
- Job titles (current/previous)
- Company domain, industry, location, employee count, funding status
- Keywords, skills

The exact JSON schema shape for the search endpoint is NOT fully confirmed in publicly accessible docs — the docs hub shows it's structured differently from the enrichment endpoint. This is MEDIUM confidence.

Recommended approach: Implement with a flexible filter builder that maps DiscoveryFilter fields to AI Ark's known filter structure, and handle the response defensively with `.passthrough()` Zod schemas (same pattern as existing aiark.ts).

**Response shape (HIGH confidence — consistent with aiark.ts pattern):**
```json
{
  "data": [...],            // or array at root
  "pageNumber": 0,
  "pageSize": 25,
  "totalElements": 1250,
  "totalPages": 50
}
```

Each person record includes: id, first_name, last_name, title/job_title, linkedin_url, email (may be included), location, company name+domain.

**DiscoveredPerson mapping:** Same as aiark-person.ts pattern.

**STATE.md blocker resolution:** The People Search endpoint is confirmed at `https://api.ai-ark.com/api/developer-portal/v1/people` — the same base URL as the existing enrichment adapters. The endpoint EXISTS and is documented. The auth header `X-TOKEN` is LOW confidence but consistent with existing code. Recommendation: implement with same LOW confidence caveat, test with live key before Phase 17.

---

### Serper.dev (DISC-04)

**Base Endpoint:** `POST https://google.serper.dev/search`
**Auth:** `X-API-KEY: {SERPER_API_KEY}` header (HIGH confidence — confirmed across multiple sources)
**Content-Type:** `application/json`

**Search type switching via body (MEDIUM confidence — confirmed from docs.sim.ai):**
```json
{ "q": "CTO manufacturing companies Dallas", "type": "search" }   // web results
{ "q": "HVAC contractors Dallas", "type": "places" }              // Google Maps places
{ "q": "site:reddit.com CTO manufacturing software complaints", "type": "search" }  // social (via site: operator)
```

**Web response fields (MEDIUM confidence):**
```json
{
  "organic": [
    { "title": "...", "link": "...", "snippet": "...", "position": 1 }
  ],
  "searchParameters": { "q": "...", "type": "search" }
}
```

**Maps/places response fields (MEDIUM confidence):**
```json
{
  "places": [
    {
      "title": "Acme HVAC",
      "address": "123 Main St, Dallas TX",
      "phone": "+1 214-555-0100",
      "website": "https://acmehvac.com",
      "rating": 4.5,
      "ratingCount": 127,
      "cid": "..."
    }
  ]
}
```

**SerperAdapter design (3 methods on single class):**

```typescript
class SerperAdapter {
  async searchWeb(query: string, limit?: number): Promise<SerperWebResult[]>
  async searchMaps(query: string): Promise<SerperMapsResult[]>
  async searchSocial(query: string): Promise<SerperWebResult[]>  // same as web but site: prefixed
}
```

**Maps results → DiscoveredPerson staging note:** Maps results are company-level records (per CONTEXT.md). Stage them as DiscoveredPerson records with:
- `company` ← `place.title`
- `phone` ← `place.phone`
- `companyDomain` ← extracted from `place.website`
- `location` ← `place.address`
- `firstName`, `lastName`, `email`, `jobTitle` all null (agent handles website scraping in Phase 17)

**Social results → NOT staged:** Return as raw signal data from the tool, agent passes to Phase 18 SignalEvent. Do NOT write social mentions to DiscoveredPerson.

**Cost:** $0.30/1,000 queries at volume. Estimate `costUsd: 0.001` per call (1 credit = $0.001 at standard pricing, confirm at runtime).

---

### Firecrawl Directory Extraction (DISC-05)

**SDK:** `@mendable/firecrawl-js` v4.13.2 — ALREADY INSTALLED
**Method:** `client.extract({ urls: [...], prompt: "...", schema: zod_schema })` — ALREADY USED in firecrawl-company.ts

**Fixed extraction schema for DiscoveredPerson (to define in Phase 16):**
```typescript
const DirectoryPersonSchema = z.object({
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().optional(),
});
```

**Extraction prompt example:**
```
Extract all people from this directory page. For each person, capture their full name,
email address, job title, company/organization, phone number, and LinkedIn profile URL.
If a name cannot be split into first/last, put the full name in the 'name' field.
```

**Basic validation (per CONTEXT.md):**
```typescript
function isValidExtraction(record: DirectoryPerson): boolean {
  // Must have name OR email
  const hasIdentity = Boolean(record.name || record.firstName || record.email);
  // Email must look like an email if present
  const emailOk = !record.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email);
  // LinkedIn must look like a URL if present
  const linkedinOk = !record.linkedinUrl || record.linkedinUrl.startsWith('http');
  return hasIdentity && emailOk && linkedinOk;
}
```

**Firecrawl extract() note:** The existing `firecrawl-company.ts` uses `client.extract()` and notes it "is deprecated but still functional." At v4.13.2, this is CONFIRMED still working. The RESEARCH.md for Phase 15 didn't flag this. For Phase 16, use the same pattern — it's working, stable, and already understood by the team.

**Cost:** `PROVIDER_COSTS.firecrawl = 0.001` (already in costs.ts). Each extract call = 1 firecrawl credit. Add a `DISCOVERY_COSTS` registry similar to `PROVIDER_COSTS` or extend it.

**Agent tool design for Firecrawl:**
```typescript
extractDirectory: tool({
  description: "Extract structured contact list from a URL (directory, association member list, government database)...",
  inputSchema: z.object({
    url: z.string().url(),
    workspaceSlug: z.string(),
    discoveryRunId: z.string().optional(),
  }),
  execute: async (params) => {
    // Call firecrawlDirectoryAdapter.extract(url)
    // Validate results
    // Stage to DiscoveredPerson
    return { staged, skipped, url }
  }
})
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP retry logic | Custom exponential backoff | AbortController + try/catch (project pattern) | The existing enrichment adapters use simple timeout+throw, not retry. Keep consistent. Phase 16 can add retry for 429s only. |
| Response validation | Manual type checks | Zod `.passthrough()` schemas | Already the pattern in aiark.ts and aiark-person.ts |
| Firecrawl client | Fetch calls to Firecrawl API | @mendable/firecrawl-js client | Already installed, already has extract() in use |
| Discovery run ID | UUID generation | `crypto.randomUUID()` (Node built-in) | No package needed |

**Key insight:** The project has a mature adapter pattern established by the enrichment providers. Phase 16 is strictly applying that same pattern to discovery (search) instead of enrichment (lookup).

---

## Common Pitfalls

### Pitfall 1: Mixing up Prospeo's two APIs

**What goes wrong:** Confusing `/enrich-person` (existing, email lookup by LinkedIn URL) with `/search-person` (new, bulk discovery). They use different request shapes.
**Why it happens:** The prospeo.ts enrichment adapter exists and looks similar.
**How to avoid:** Name the new file `prospeo-search.ts` explicitly. Keep the two adapters completely separate.
**Warning signs:** Getting 404s or unexpected response shapes from Prospeo.

### Pitfall 2: Expecting emails from Apollo search

**What goes wrong:** Developer expects Apollo search results to include email addresses and tries to populate `email` on DiscoveredPerson.
**Why it happens:** Apollo's enrichment API does return emails, but the People Search endpoint explicitly does NOT.
**How to avoid:** Apollo adapter leaves `email: null`. Stage `sourceId` (Apollo person_id) for Phase 17 enrichment.
**Warning signs:** All Apollo records have null emails — this is CORRECT, not a bug.

### Pitfall 3: AI Ark auth header mismatch

**What goes wrong:** API returns 401/403 because `X-TOKEN` is not the correct header name.
**Why it happens:** AI Ark docs say "Header" security without specifying the literal name. `X-TOKEN` is a guess confirmed LOW confidence.
**How to avoid:** Use the same `AUTH_HEADER_NAME` constant pattern as aiark.ts. Log a clear warning on 401/403 pointing to the docs. Test with real API key before Phase 17.
**Warning signs:** 401/403 responses from AI Ark people search endpoint.

### Pitfall 4: Firecrawl extract() schema Zod version mismatch

**What goes wrong:** TypeScript error when passing Zod schema to `client.extract()` due to bundled vs project Zod version conflict.
**Why it happens:** Firecrawl JS SDK bundles its own Zod. Already documented in firecrawl-company.ts: `schema: CompanyExtractSchema as any`.
**How to avoid:** Use the same `as any` cast pattern that firecrawl-company.ts already uses.
**Warning signs:** TypeScript compile errors on `client.extract({ schema: ... })`.

### Pitfall 5: Serper Maps results staged as people records

**What goes wrong:** Maps places (businesses) are staged with null person fields and create noise in Phase 17 dedup.
**Why it happens:** CONTEXT.md decision to store maps results as "company-level records" but DiscoveredPerson has no `recordType` field.
**How to avoid:** For maps results, set `discoverySource: "serper-maps"` (separate from `"serper-web"` and `"serper-social"`). Phase 17 dedup can filter by source. Do NOT stage social results at all.
**Warning signs:** Maps results being confused with people records in Phase 17.

### Pitfall 6: DiscoveredPerson rawResponse field missing

**What goes wrong:** CONTEXT.md says "each DiscoveredPerson record tracks... raw API response in a JSON column" but the DiscoveredPerson schema has NO rawResponse column.
**Why it happens:** The schema was added in Phase 15 without a rawResponse column on DiscoveredPerson (it exists on EnrichmentLog, not DiscoveredPerson).
**How to avoid:** Two options:
  1. Add `rawResponse String?` column to DiscoveredPerson via `prisma db push` (recommended — aligns with CONTEXT.md intent)
  2. Store rawResponse in the agent tool's return value only (no DB persistence)
**Warning signs:** Can't debug which API response produced a specific DiscoveredPerson record.

---

## Code Examples

### Apollo adapter skeleton

```typescript
// src/lib/discovery/adapters/apollo.ts
import { z } from "zod";
import type { DiscoveryAdapter, DiscoveryFilter, DiscoveryResult } from "../types";

const APOLLO_SEARCH_ENDPOINT = "https://api.apollo.io/api/v1/mixed_people/api_search";
const TIMEOUT_MS = 15_000;

function getApiKey(): string {
  const key = process.env.APOLLO_API_KEY;
  if (!key) throw new Error("APOLLO_API_KEY environment variable is not set");
  return key;
}

// Seniority mapping: DiscoveryFilter.seniority → Apollo values
const SENIORITY_MAP: Record<string, string> = {
  c_suite: "c_suite",
  vp: "vp",
  director: "director",
  manager: "manager",
  ic: "senior",
};

const ApolloPersonSchema = z.object({
  id: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  title: z.string().optional(),
  linkedin_url: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  organization_name: z.string().optional(),
  organization: z.object({
    estimated_num_employees: z.number().optional(),
    industry: z.string().optional(),
  }).optional(),
}).passthrough();

const ApolloSearchResponseSchema = z.object({
  people: z.array(ApolloPersonSchema),
  total_entries: z.number().optional(),
  pagination: z.object({ page: z.number(), per_page: z.number() }).optional(),
}).passthrough();

export class ApolloAdapter implements DiscoveryAdapter {
  readonly name = "apollo";
  readonly estimatedCostPerResult = 0;

  async search(filters: DiscoveryFilter, limit: number, pageToken?: string): Promise<DiscoveryResult> {
    const page = pageToken ? parseInt(pageToken, 10) : 1;
    const perPage = Math.min(limit, 100);

    const body: Record<string, unknown> = {
      page,
      per_page: perPage,
    };
    if (filters.jobTitles?.length) body.person_titles = filters.jobTitles;
    if (filters.seniority?.length) body.person_seniorities = filters.seniority.map(s => SENIORITY_MAP[s] ?? s);
    if (filters.locations?.length) body.person_locations = filters.locations;
    if (filters.companySizes?.length) body.organization_num_employees_ranges = filters.companySizes.map(sizeToApolloRange);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let raw: unknown;
    try {
      const res = await fetch(APOLLO_SEARCH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "x-api-key": getApiKey(),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.status === 429) throw Object.assign(new Error("Apollo rate limited"), { status: 429 });
      if (!res.ok) throw new Error(`Apollo HTTP ${res.status}`);
      raw = await res.json();
    } finally {
      clearTimeout(timeout);
    }

    const parsed = ApolloSearchResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return { people: [], costUsd: 0, rawResponse: raw };
    }

    const people = parsed.data.people.map((p) => ({
      firstName: p.first_name,
      lastName: p.last_name,
      jobTitle: p.title,
      linkedinUrl: p.linkedin_url,
      company: p.organization_name,
      location: [p.city, p.country].filter(Boolean).join(", ") || undefined,
      sourceId: p.id,
    }));

    const totalEntries = parsed.data.total_entries ?? 0;
    const hasMore = page * perPage < totalEntries;

    return {
      people,
      totalAvailable: totalEntries,
      hasMore,
      nextPageToken: hasMore ? String(page + 1) : undefined,
      costUsd: 0, // Apollo search is free
      rawResponse: raw,
    };
  }
}

export const apolloAdapter = new ApolloAdapter();

function sizeToApolloRange(size: string): string {
  // e.g. "51-200" → "51,200", "500+" → "500,100000"
  if (size.endsWith("+")) return `${size.slice(0, -1)},100000`;
  return size.replace("-", ",");
}
```

### Serper adapter skeleton

```typescript
// src/lib/discovery/adapters/serper.ts
const SERPER_ENDPOINT = "https://google.serper.dev/search";
const TIMEOUT_MS = 10_000;

function getApiKey(): string {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY environment variable is not set");
  return key;
}

async function serperPost(body: Record<string, unknown>): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SERPER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": getApiKey(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export const serperAdapter = {
  async searchWeb(query: string, num = 10): Promise<SerperWebResult[]> {
    const raw = await serperPost({ q: query, type: "search", num }) as any;
    return (raw?.organic ?? []).map(mapWebResult);
  },

  async searchMaps(query: string): Promise<SerperMapsResult[]> {
    const raw = await serperPost({ q: query, type: "places" }) as any;
    return (raw?.places ?? []).map(mapMapsResult);
  },

  async searchSocial(query: string, platform: "reddit" | "twitter" = "reddit"): Promise<SerperWebResult[]> {
    const sitePrefix = platform === "reddit" ? "site:reddit.com" : "site:twitter.com";
    const raw = await serperPost({ q: `${sitePrefix} ${query}`, type: "search" }) as any;
    return (raw?.organic ?? []).map(mapWebResult);
  },
};

// Maps result → DiscoveredPerson (company-level, no person fields)
function mapMapsResult(place: any): SerperMapsResult {
  return {
    company: place.title,
    phone: place.phone,
    address: place.address,
    website: place.website,
    rating: place.rating,
  };
}
```

### Staging helper

```typescript
// src/lib/discovery/staging.ts
import { prisma } from "@/lib/db";
import type { DiscoveredPersonResult } from "./types";
import { randomUUID } from "crypto";

export async function stageDiscoveredPeople(input: {
  people: DiscoveredPersonResult[];
  discoverySource: string;
  workspaceSlug: string;
  searchQuery?: string;
  discoveryRunId?: string;
}): Promise<{ staged: number; runId: string }> {
  const runId = input.discoveryRunId ?? randomUUID();

  const result = await prisma.discoveredPerson.createMany({
    data: input.people.map((p) => ({
      email: p.email ?? null,
      firstName: p.firstName ?? null,
      lastName: p.lastName ?? null,
      jobTitle: p.jobTitle ?? null,
      company: p.company ?? null,
      companyDomain: p.companyDomain ?? null,
      linkedinUrl: p.linkedinUrl ?? null,
      phone: p.phone ?? null,
      location: p.location ?? null,
      discoverySource: input.discoverySource,
      searchQuery: input.searchQuery ? JSON.stringify(input.searchQuery) : null,
      workspaceSlug: input.workspaceSlug,
      discoveryRunId: runId,
      status: "staged",
    })),
    skipDuplicates: false,
  });

  return { staged: result.count, runId };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prospeo /social-url-finder | /enrich-person only | March 2026 | Already handled — existing prospeo.ts updated. New search adapter uses /search-person. |
| Firecrawl extract() (v1) | extract() at v2 API, same SDK method | v1 → v2 migration | SDK v4.13.2 exposes v2 API. `client.extract()` already confirmed working in firecrawl-company.ts. |

**Deprecated/outdated:**
- Prospeo `/social-url-finder`: Removed March 2026. Already addressed in existing prospeo.ts (comment on line 8).

---

## Open Questions

1. **DiscoveredPerson rawResponse column missing**
   - What we know: CONTEXT.md explicitly says "raw API response in a JSON column". DiscoveredPerson schema has no such column.
   - What's unclear: Was this an oversight in Phase 15, or intentional (store raw in EnrichmentLog-style table separately)?
   - Recommendation: Add `rawResponse String?` column to DiscoveredPerson as the first task in Phase 16. Small schema change, apply via `prisma db push`.

2. **Apollo industry filtering**
   - What we know: Apollo uses `organization_industry_tag_ids` (integer IDs), not free-text industry strings.
   - What's unclear: Whether string-based filtering (e.g., `"Software"`) works as a fallback, or whether we need a tag ID lookup first.
   - Recommendation: For Phase 16, map common industry strings to Apollo tag IDs (a small hardcoded map) OR use `keywords` as fallback for industry. Confirm with a real API call.

3. **AI Ark People Search request body schema**
   - What we know: Endpoint confirmed at `/api/developer-portal/v1/people`, pagination via page+size, filter categories confirmed (seniority, department, company size, etc.).
   - What's unclear: The exact JSON field names for the search filter object (e.g., is it `"seniority": "director"` or `"person": { "seniority": "director" }`).
   - Recommendation: Implement defensively with `passthrough()` Zod schema. Test live before Phase 17. The existing aiark.ts enrichment adapter is a good template for graceful degradation.

4. **Serper social results staging**
   - What we know: Per CONTEXT.md, Reddit/Twitter mentions are "signal data, not contact records — passed to Phase 18".
   - What's unclear: How exactly should .searchSocial() results be returned to the agent (structured vs raw text) if they're not staged to DiscoveredPerson?
   - Recommendation: Return raw web results (title + link + snippet) from the tool without staging. The Leads Agent includes them in its response as signal notes. Phase 18 handles structured SignalEvent creation.

5. **Credit cost tracking for discovery sources**
   - What we know: `PROVIDER_COSTS` in costs.ts tracks enrichment costs. Discovery costs need parallel tracking.
   - What's unclear: Should discovery costs use the same `DailyCostTotal` and `EnrichmentLog` tables, or separate tracking?
   - Recommendation: For Phase 16, add discovery source costs to `PROVIDER_COSTS` and use `incrementDailySpend()` from costs.ts. Full discovery cost reporting is a Phase 17 concern.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/discovery/types.ts` — DiscoveryAdapter interface (Phase 15, in codebase)
- `src/lib/enrichment/providers/prospeo.ts` — existing Prospeo adapter pattern
- `src/lib/enrichment/providers/aiark.ts` + `aiark-person.ts` — existing AI Ark adapter pattern
- `src/lib/enrichment/providers/firecrawl-company.ts` — existing Firecrawl extract() pattern
- `prisma/schema.prisma` — DiscoveredPerson model (Phase 15, in codebase)
- https://docs.apollo.io/reference/people-api-search — Apollo endpoint and response
- https://prospeo.io/api-docs/search-person — Prospeo Search Person API (endpoint, auth, filters, pagination, credits)
- https://docs.ai-ark.com/reference/people-search-1 — AI Ark People Search (endpoint, pagination, rate limits)
- https://docs.firecrawl.dev/features/extract — Firecrawl extract() (endpoint, schema support, credit system)

### Secondary (MEDIUM confidence)
- WebSearch cross-verification: Apollo seniority values (`owner`, `founder`, `c_suite`, `vp`, `director`, `manager`, `senior`, `entry`, `intern`) confirmed via multiple community sources
- WebSearch cross-verification: Apollo employee ranges format `"11,50"` confirmed via multiple sources
- docs.sim.ai/tools/serper — Serper type values (`search`, `news`, `images`, `places`, `shopping`) + response field structure

### Tertiary (LOW confidence)
- AI Ark People Search exact JSON filter field names — not confirmed from official docs, based on pattern extrapolation
- Apollo industry tag ID mapping — no official public tag ID list found, industry filtering approach unconfirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all patterns established in Phase 15 enrichment adapters
- Architecture: HIGH — DiscoveryAdapter interface, DiscoveredPerson schema, staging pattern all well-defined
- API parameters: MEDIUM — Apollo filter params and Serper confirmed via WebSearch; Prospeo HIGH from official docs; AI Ark MEDIUM from docs with LOW on exact field names
- Pitfalls: HIGH — all pitfalls identified from reading actual codebase + known API limitations

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (30 days — APIs are stable but verify AI Ark auth before implementation)
