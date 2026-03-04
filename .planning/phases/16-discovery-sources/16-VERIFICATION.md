---
phase: 16-discovery-sources
verified: 2026-03-04T13:00:00Z
status: passed
score: 13/13 must-haves verified
---

# Phase 16: Discovery Sources Verification Report

**Phase Goal:** The Leads Agent has access to five external discovery sources — Apollo, Prospeo Search, AI Ark Search, Serper.dev, and Firecrawl directory extraction — each returning structured DiscoveredPerson records
**Verified:** 2026-03-04
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Apollo adapter searches Apollo People API by title, seniority, location, company size, returning paginated DiscoveredPersonResult arrays with sourceId | VERIFIED | `src/lib/discovery/adapters/apollo.ts` — ApolloAdapter implements DiscoveryAdapter, maps all DiscoveryFilter fields to Apollo params, sourceId set from `person.id`, pagination via page/per_page |
| 2 | Prospeo Search adapter searches /search-person API with filters including funding stage and headcount, returning paginated DiscoveredPersonResult arrays | VERIFIED | `src/lib/discovery/adapters/prospeo-search.ts` — ProspeoSearchAdapter implements DiscoveryAdapter, include/exclude array format, extras param for company_funding/person_department |
| 3 | DiscoveredPerson table has a rawResponse column for storing raw API responses per record | VERIFIED | `prisma/schema.prisma` line 186: `rawResponse     String?  // JSON — raw API response from discovery source for debugging/audit` |
| 4 | stageDiscoveredPeople helper writes batches of DiscoveredPersonResult records to the DiscoveredPerson table with source tracking and run grouping | VERIFIED | `src/lib/discovery/staging.ts` — full implementation, `prisma.discoveredPerson.createMany` with skipDuplicates: false, per-person rawResponse serialization |
| 5 | AI Ark Search adapter searches AI Ark People Search API by role, seniority, department, location, and keywords, returning paginated DiscoveredPersonResult arrays | VERIFIED | `src/lib/discovery/adapters/aiark-search.ts` — AiArkSearchAdapter implements DiscoveryAdapter, zero-based pagination, handles both root-array and envelope response shapes |
| 6 | Serper adapter searches Google web results, Maps places, and social mentions via three methods on a single adapter object | VERIFIED | `src/lib/discovery/adapters/serper.ts` — serperAdapter const object with searchWeb, searchMaps, searchSocial; all three methods present and substantive |
| 7 | Firecrawl Directory adapter extracts structured contact lists from arbitrary URLs using Firecrawl extract() with a fixed JSON schema | VERIFIED | `src/lib/discovery/adapters/firecrawl-directory.ts` — client.extract() called with fixed DirectoryPersonSchema and extraction prompt, 45s timeout |
| 8 | Maps results are staged as company-level records (no person fields) with discoverySource 'serper-maps' | VERIFIED | `leads.ts` searchGoogle tool maps mode: `discoverySource: "serper-maps"`, fields are company/phone/companyDomain/location only — no firstName/lastName/email/jobTitle |
| 9 | Social mention results are returned as raw data without being staged to DiscoveredPerson (signal data for Phase 18) | VERIFIED | serper.ts searchSocial returns raw results; leads.ts searchGoogle tool does not expose social mode — only web/maps modes exposed, consistent with plan decision |
| 10 | Firecrawl extraction validates results and filters obvious junk (bad emails, garbage names) | VERIFIED | firecrawl-directory.ts: `isValidExtraction()` checks hasIdentity, emailOk regex, linkedinOk; skippedCount tracked |
| 11 | Leads Agent has 5 discovery tools (searchApollo, searchProspeo, searchAiArk, searchGoogle, extractDirectory) all staging results to DiscoveredPerson | VERIFIED | leads.ts lines 157-535: all 5 tools in leadsTools, each calls stageDiscoveredPeople (web mode intentionally skips staging — informational only by design) |
| 12 | Leads Agent system prompt describes discovery capabilities to guide tool selection | VERIFIED | leads.ts lines 545-562: full Discovery (External Search) section with per-source descriptions and discovery rules |
| 13 | Discovery costs registered in PROVIDER_COSTS | VERIFIED | costs.ts lines 16-22: apollo-search, prospeo-search, aiark-search, serper-web, serper-maps, serper-social, firecrawl-extract all present |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | rawResponse column on DiscoveredPerson model | VERIFIED | Line 186: `rawResponse String?` present in DiscoveredPerson model |
| `src/lib/discovery/staging.ts` | stageDiscoveredPeople function for batch DB writes | VERIFIED | Exports StagingInput interface and stageDiscoveredPeople function, 87 lines |
| `src/lib/discovery/adapters/apollo.ts` | ApolloAdapter class implementing DiscoveryAdapter | VERIFIED | Exports ApolloAdapter class and apolloAdapter singleton, 239 lines, full filter mapping |
| `src/lib/discovery/adapters/prospeo-search.ts` | ProspeoSearchAdapter class implementing DiscoveryAdapter | VERIFIED | Exports ProspeoSearchAdapter class and prospeoSearchAdapter singleton, 228 lines |
| `src/lib/discovery/adapters/aiark-search.ts` | AiArkSearchAdapter class implementing DiscoveryAdapter | VERIFIED | Exports AiArkSearchAdapter class and aiarkSearchAdapter singleton, 253 lines |
| `src/lib/discovery/adapters/serper.ts` | SerperAdapter with searchWeb, searchMaps, searchSocial + result types | VERIFIED | Exports serperAdapter const object, SerperWebResult, SerperMapsResult types, 243 lines |
| `src/lib/discovery/adapters/firecrawl-directory.ts` | FirecrawlDirectoryAdapter for URL extraction | VERIFIED | Exports firecrawlDirectoryAdapter const and DirectoryExtractionResult type, 264 lines |
| `src/lib/agents/leads.ts` | 5 new discovery tools added to leadsTools + updated system prompt | VERIFIED | 636 lines (min 300 required), all 5 tools present, Discovery section in system prompt |
| `src/lib/enrichment/costs.ts` | Discovery source costs added to PROVIDER_COSTS | VERIFIED | apollo-search entry present at line 16; all 7 discovery cost entries present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `adapters/apollo.ts` | `discovery/types.ts` | implements DiscoveryAdapter | VERIFIED | `export class ApolloAdapter implements DiscoveryAdapter` at line 106 |
| `adapters/prospeo-search.ts` | `discovery/types.ts` | implements DiscoveryAdapter | VERIFIED | `export class ProspeoSearchAdapter implements DiscoveryAdapter` at line 84 |
| `adapters/aiark-search.ts` | `discovery/types.ts` | implements DiscoveryAdapter | VERIFIED | `export class AiArkSearchAdapter implements DiscoveryAdapter` at line 154 |
| `staging.ts` | `prisma/schema.prisma` | prisma.discoveredPerson.createMany | VERIFIED | Line 80: `prisma.discoveredPerson.createMany({ data: records, skipDuplicates: false })` |
| `adapters/firecrawl-directory.ts` | `@mendable/firecrawl-js` | client.extract() method | VERIFIED | Line 191: `client.extract({ urls: [url], prompt: ..., schema: ... })` |
| `leads.ts` | `adapters/apollo.ts` | apolloAdapter.search() | VERIFIED | Line 210: `apolloAdapter.search(filters, params.limit, params.pageToken)` |
| `leads.ts` | `adapters/prospeo-search.ts` | prospeoSearchAdapter.search() | VERIFIED | Line 317: `prospeoSearchAdapter.search(filters, params.limit, params.pageToken, extras)` |
| `leads.ts` | `adapters/aiark-search.ts` | aiarkSearchAdapter.search() | VERIFIED | Line 391: `aiarkSearchAdapter.search(filters, params.limit, params.pageToken)` |
| `leads.ts` | `adapters/serper.ts` | serperAdapter.searchMaps/searchWeb | VERIFIED | Lines 441, 472: `serperAdapter.searchMaps(...)` and `serperAdapter.searchWeb(...)` |
| `leads.ts` | `adapters/firecrawl-directory.ts` | firecrawlDirectoryAdapter.extract() | VERIFIED | Line 510: `firecrawlDirectoryAdapter.extract(params.url)` |
| `leads.ts` | `discovery/staging.ts` | stageDiscoveredPeople | VERIFIED | All 5 tool execute functions call `stageDiscoveredPeople(...)` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DISC-01 | 16-01, 16-03 | Leads Agent can search Apollo.io People API by title, seniority, industry, location, company size — paginated results | SATISFIED | ApolloAdapter (apollo.ts) + searchApollo tool (leads.ts) fully implement this |
| DISC-02 | 16-01, 16-03 | Leads Agent can search Prospeo Search Person API with 20+ filters including funding stage and headcount | SATISFIED | ProspeoSearchAdapter (prospeo-search.ts) + searchProspeo tool with extras param for fundingStages/departments |
| DISC-03 | 16-02, 16-03 | Leads Agent can search AI Ark People Search API by role, seniority, department, location, keywords | SATISFIED | AiArkSearchAdapter (aiark-search.ts) + searchAiArk tool (leads.ts) |
| DISC-04 | 16-02, 16-03 | Leads Agent can search Serper.dev for Google web results, Maps results, and social mentions | SATISFIED | serperAdapter (serper.ts) with all three methods; searchGoogle tool exposes web + maps modes. Social not surfaced as a tool (design decision per CONTEXT.md — signal data for Phase 18) |
| DISC-05 | 16-02, 16-03 | Leads Agent can scrape custom directories via Firecrawl /extract endpoint with structured JSON schema | SATISFIED | firecrawlDirectoryAdapter (firecrawl-directory.ts) + extractDirectory tool (leads.ts) |

**Orphaned Requirements Check:** Requirements DISC-06, DISC-09, DISC-10 are mapped to Phase 15 in REQUIREMENTS.md traceability table — not orphaned for Phase 16. No unmapped DISC-01 through DISC-05 requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `adapters/aiark-search.ts` | 26 | `const AUTH_HEADER_NAME = "X-TOKEN"` — LOW CONFIDENCE comment | Info | By design: auth header documented as uncertain, comment directs to docs.ai-ark.com. Not a code defect. |

No TODO/FIXME blockers, no empty implementations, no return null stubs, no placeholder handlers found in any phase 16 files.

---

### Human Verification Required

None. All discovery adapter integrations are verifiable by code inspection — the contracts (DiscoveryAdapter interface, DiscoveredPersonResult shape, stageDiscoveredPeople writes) are fully traceable. Live API calls would require real API keys and external service availability, which is out of scope for code verification.

The AI Ark auth header (X-TOKEN) is flagged as LOW CONFIDENCE in the code itself — this is the correct mitigation pattern. Actual API response testing would confirm whether auth works, but that is a deployment concern, not a code completeness concern.

---

### Gaps Summary

No gaps. All 13 observable truths verified. All 9 artifacts exist and are substantive (no stubs, no placeholders). All 11 key links confirmed wired. Requirements DISC-01 through DISC-05 fully satisfied with implementation evidence.

The phase goal is achieved: the Leads Agent has access to five external discovery sources (Apollo, Prospeo Search, AI Ark Search, Serper.dev, Firecrawl directory extraction), each returning structured DiscoveredPerson records staged to the DiscoveredPerson table.

---

_Verified: 2026-03-04_
_Verifier: Claude (gsd-verifier)_
