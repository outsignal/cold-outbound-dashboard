---
phase: 16-discovery-sources
plan: 02
subsystem: api
tags: [aiark, serper, firecrawl, discovery, adapters, typescript, zod]

# Dependency graph
requires:
  - phase: 16-discovery-sources-plan-01
    provides: DiscoveryAdapter interface, DiscoveredPersonResult types, adapters directory
provides:
  - AiArkSearchAdapter implementing DiscoveryAdapter for bulk people search by role/seniority/location/keywords
  - serperAdapter with searchWeb, searchMaps, searchSocial for Google web/Maps/social discovery
  - firecrawlDirectoryAdapter for structured contact extraction from arbitrary directory URLs
affects: [16-03-leads-agent-tools, 18-signal-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod passthrough() schemas for defensive validation of undocumented API responses"
    - "AbortController timeout pattern with clearTimeout in finally block"
    - "429 status attached to thrown Error object for upstream retry handling"
    - "Firecrawl schema cast to 'as any' for Zod v3/v4 mismatch workaround"
    - "Singleton export pattern: export const adapter = new AdapterClass()"
    - "const object export for non-DiscoveryAdapter adapters (Serper, Firecrawl)"

key-files:
  created:
    - src/lib/discovery/adapters/aiark-search.ts
    - src/lib/discovery/adapters/serper.ts
    - src/lib/discovery/adapters/firecrawl-directory.ts
  modified: []

key-decisions:
  - "AI Ark adapter uses X-TOKEN auth header (LOW CONFIDENCE) with inline comment directing to docs.ai-ark.com — same pattern as aiark-person.ts"
  - "Serper adapter exports a const object (not a class), does NOT implement DiscoveryAdapter — query-based, not filter-based"
  - "Social search results (searchSocial) returned raw — NOT staged to DiscoveredPerson; signal data reserved for Phase 18 SignalEvent creation"
  - "Maps results are company-level records with null person fields (firstName, lastName, email, jobTitle all undefined)"
  - "Firecrawl directory uses 45s timeout vs 30s for company extraction — directory pages can be larger"
  - "companyDomain derived from email on Firecrawl extraction using same 24-provider free email exclusion list as enrich endpoint"

patterns-established:
  - "Non-filter-based adapters (Serper, Firecrawl) export const objects, not classes — they don't implement DiscoveryAdapter"
  - "DiscoveryAdapter implementors (AI Ark) export both class and singleton instance"
  - "All adapters throw Object.assign(error, { status: 429 }) for rate limit errors — upstream retry protocol"

requirements-completed: [DISC-03, DISC-04, DISC-05]

# Metrics
duration: 12min
completed: 2026-03-04
---

# Phase 16 Plan 02: Discovery Sources Summary

**AI Ark Search, Serper (web/maps/social), and Firecrawl directory extraction adapters completing the five-source discovery toolkit alongside Apollo and Prospeo from Plan 01**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-04T11:50:01Z
- **Completed:** 2026-03-04T12:02:01Z
- **Tasks:** 3
- **Files modified:** 3 created

## Accomplishments
- AiArkSearchAdapter implementing DiscoveryAdapter with zero-based pagination, filter mapping from DiscoveryFilter to AI Ark params (title, seniority, location, industry, company_size, keywords, company_domain), and 15s AbortController timeout
- serperAdapter const object with three methods: searchWeb (organic results), searchMaps (company-level records with companyDomain extracted from website URLs), searchSocial (Reddit/Twitter site-prefix queries returning raw signal data)
- firecrawlDirectoryAdapter using Firecrawl SDK extract() with fixed DirectoryPersonSchema, 45s timeout, isValidExtraction() filtering (bad emails, no identity, non-LinkedIn URLs), name splitting, and companyDomain derivation

## Task Commits

Each task was committed atomically:

1. **Task 1: AI Ark Search discovery adapter** - `12f9ba4` (feat)
2. **Task 2: Serper discovery adapter** - `3cba0d0` (feat)
3. **Task 3: Firecrawl directory extraction adapter** - `b687115` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/lib/discovery/adapters/aiark-search.ts` - AiArkSearchAdapter class + aiarkSearchAdapter singleton; searches AI Ark People API by role/seniority/location/industry/keywords/companyDomains with zero-based pagination
- `src/lib/discovery/adapters/serper.ts` - serperAdapter const object with searchWeb/searchMaps/searchSocial; SerperWebResult and SerperMapsResult types exported
- `src/lib/discovery/adapters/firecrawl-directory.ts` - firecrawlDirectoryAdapter const object with extract(); DirectoryExtractionResult type exported

## Decisions Made
- AI Ark uses X-TOKEN auth header with LOW CONFIDENCE comment — same caveat as aiark-person.ts enrichment adapter
- Serper adapter is a const object (not DiscoveryAdapter implementor) — Serper takes free-text queries, not structured filters
- Social results (searchSocial) are returned raw without staging — Phase 18 will create SignalEvents from these
- Maps results have null person fields by design — they are company-level records staged with discoverySource: "serper-maps" in Plan 03
- Firecrawl directory timeout is 45s (vs 30s for company extraction) — directory pages with many contacts take longer
- Free email exclusion list (24 providers) inlined in firecrawl-directory.ts — same list as enrich endpoint

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for adapter code. API keys (AIARK_API_KEY, SERPER_API_KEY, FIRECRAWL_API_KEY) were already expected by existing enrichment adapters and must be set in environment.

## Next Phase Readiness
- All three adapters ready for Plan 03 Leads Agent tool wiring
- Plan 01 (Apollo + Prospeo adapters) must also complete before Plan 03 can wire all five sources
- AI Ark auth header confidence is LOW — if calls return 401/403 in testing, check docs.ai-ark.com and update AUTH_HEADER_NAME in aiark-search.ts

---
*Phase: 16-discovery-sources*
*Completed: 2026-03-04*

## Self-Check: PASSED

- FOUND: src/lib/discovery/adapters/aiark-search.ts
- FOUND: src/lib/discovery/adapters/serper.ts
- FOUND: src/lib/discovery/adapters/firecrawl-directory.ts
- FOUND: .planning/phases/16-discovery-sources/16-02-SUMMARY.md
- FOUND: commit 12f9ba4 (AI Ark adapter)
- FOUND: commit 3cba0d0 (Serper adapter)
- FOUND: commit b687115 (Firecrawl Directory adapter)
