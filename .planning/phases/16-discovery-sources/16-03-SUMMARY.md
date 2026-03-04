---
phase: 16-discovery-sources
plan: 03
subsystem: agents
tags: [discovery, leads-agent, apollo, prospeo, aiark, serper, firecrawl, tools]
dependency_graph:
  requires:
    - phase: 16-01
      provides: apolloAdapter, prospeoSearchAdapter, stageDiscoveredPeople, DiscoveryAdapter interface
    - phase: 16-02
      provides: aiarkSearchAdapter, serperAdapter, firecrawlDirectoryAdapter
  provides:
    - Leads Agent with 5 discovery tools (searchApollo, searchProspeo, searchAiArk, searchGoogle, extractDirectory)
    - Discovery source costs registered in PROVIDER_COSTS
    - Updated system prompt with Discovery section and source selection rules
  affects:
    - src/lib/agents/leads.ts
    - src/lib/enrichment/costs.ts
tech_stack:
  added: []
  patterns:
    - "Discovery tools follow adapter.search() -> stageDiscoveredPeople() -> return preview pattern"
    - "Prospeo extras param used for Prospeo-specific filters (company_funding, person_department) beyond DiscoveryFilter"
    - "serperAdapter searchMaps stages company-level records with null person fields to DiscoveredPerson"
    - "serperAdapter searchWeb returns informational results — NOT staged (no person data)"
    - "Apollo tool omits incrementDailySpend — free source, no cost to track"
key_files:
  created: []
  modified:
    - src/lib/agents/leads.ts
    - src/lib/enrichment/costs.ts
decisions:
  - "searchGoogle web mode is informational only — returns URLs/snippets for agent analysis, NOT staged to DiscoveredPerson"
  - "Apollo tool does not call incrementDailySpend — search is free and costUsd=0 from adapter"
  - "Prospeo extras built inline in tool execute — fundingStages and departments mapped to Prospeo API format before passing to adapter.search() extras param"
  - "costs.ts discovery entries added in this plan (they were prepared/staged but not previously committed)"
metrics:
  duration_minutes: 28
  completed_date: "2026-03-04"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 2
---

# Phase 16 Plan 03: Discovery Sources (Leads Agent Tool Wiring) Summary

**One-liner:** Five discovery adapters (Apollo free search, Prospeo paid, AI Ark, Serper web/maps, Firecrawl directory) wired into Leads Agent as callable tools with system prompt guidance for source selection.

## What Was Built

### Discovery Costs Registered (`src/lib/enrichment/costs.ts`)

Added 7 discovery source entries to `PROVIDER_COSTS`:
- `apollo-search: 0` — free search
- `prospeo-search: 0.002` — 1 credit per request
- `aiark-search: 0.003` — same as enrichment cost
- `serper-web: 0.001` — 1 credit per search
- `serper-maps: 0.001` — 1 credit per search
- `serper-social: 0.001` — 1 credit per search
- `firecrawl-extract: 0.001` — 1 credit per extract

### Five Discovery Tools (`src/lib/agents/leads.ts`)

**searchApollo** — Calls `apolloAdapter.search()`, stages all results via `stageDiscoveredPeople({ discoverySource: "apollo" })`. No `incrementDailySpend` call (free source). Returns compact 10-person preview, staged count, runId, pagination info.

**searchProspeo** — Calls `prospeoSearchAdapter.search()` with `extras` param for `fundingStages` (mapped to `company_funding`) and `departments` (mapped to `person_department`). Calls `incrementDailySpend("prospeo-search", ...)` for cost tracking. Stages via `stageDiscoveredPeople({ discoverySource: "prospeo" })`.

**searchAiArk** — Calls `aiarkSearchAdapter.search()`. Calls `incrementDailySpend("aiark-search", ...)`. Stages via `stageDiscoveredPeople({ discoverySource: "aiark" })`.

**searchGoogle** — Two-mode tool: `maps` mode calls `serperAdapter.searchMaps()`, stages company-level records (no firstName/lastName/email — just company/phone/companyDomain/location) as `discoverySource: "serper-maps"`. `web` mode calls `serperAdapter.searchWeb()`, returns informational results to agent WITHOUT staging (no person data in web results).

**extractDirectory** — Calls `firecrawlDirectoryAdapter.extract(url)`. Stages via `stageDiscoveredPeople({ discoverySource: "firecrawl", discoveryRunId })`. Returns valid/skipped counts alongside the 10-person preview.

### Updated System Prompt (`LEADS_SYSTEM_PROMPT`)

- Capabilities line updated to mention external discovery sources
- New `## Discovery (External Search)` section added with:
  - Per-source descriptions with cost indicators
  - Discovery rules (staging table, no emails from most sources, SMB vs enterprise guidance)
  - Rule to always show cost and staged count after each call

## Verification

1. `npx tsc --noEmit` — passes, all imports resolve and tools type-check against `tool()` API
2. All 5 discovery tools registered in `leadsTools` object (confirmed via grep)
3. Every tool calls `stageDiscoveredPeople()` — 5 staging calls, one per tool (web search skips staging by design: informational only)
4. Every paid tool calls `incrementDailySpend()` — 5 calls for prospeo, aiark, serper-maps, serper-web, firecrawl (Apollo excluded: free)
5. System prompt includes Discovery section with source descriptions and rules
6. All tool return values include compact preview (max 10 records), staged count, cost, pagination info
7. No tool writes directly to Person table — confirmed via grep (0 occurrences of `prisma.person.`)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1: Discovery costs + 5 tools + system prompt | `3a91abe` | Wire all 5 adapters into Leads Agent |

## Deviations from Plan

None — plan executed exactly as written.

Note: costs.ts discovery entries were listed in plan as new additions. They existed in working tree as uncommitted changes when this plan executed — committed together with leads.ts as part of this plan's task.

## Self-Check: PASSED

- FOUND: src/lib/agents/leads.ts (635 lines, min 300 required)
- FOUND: src/lib/enrichment/costs.ts (apollo-search entry at line 17)
- FOUND: commit 3a91abe (Task 1)
- FOUND: searchApollo tool in leadsTools
- FOUND: searchProspeo tool in leadsTools
- FOUND: searchAiArk tool in leadsTools
- FOUND: searchGoogle tool in leadsTools
- FOUND: extractDirectory tool in leadsTools
- FOUND: stageDiscoveredPeople import and 5 tool calls
- FOUND: incrementDailySpend import and 5 paid-tool calls
- FOUND: ## Discovery section in LEADS_SYSTEM_PROMPT
- TypeScript compiles cleanly (npx tsc --noEmit passes)
- No direct Person table writes (grep confirms 0 occurrences)
