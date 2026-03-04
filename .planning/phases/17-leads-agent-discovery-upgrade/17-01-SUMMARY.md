---
phase: 17-leads-agent-discovery-upgrade
plan: "01"
subsystem: discovery
tags: [deduplication, promotion, enrichment, leads-pipeline]
dependency_graph:
  requires:
    - prisma/schema.prisma (DiscoveredPerson, Person, PersonWorkspace models)
    - src/lib/enrichment/queue.ts (enqueueJob)
    - src/lib/enrichment/types.ts (Provider, EntityType)
    - src/lib/db.ts (prisma client)
  provides:
    - deduplicateAndPromote() — dedup + promotion + enrichment trigger
    - PromotionResult type — result shape for callers
    - stringSimilarity() / levenshteinDistance() — fuzzy name matching utilities
  affects:
    - src/lib/enrichment/types.ts (Provider union extended)
    - Any future API route or agent that triggers promotion (Phase 17 plan 02+)
tech_stack:
  added: []
  patterns:
    - Three-leg dedup (email exact, LinkedIn URL exact, Levenshtein fuzzy)
    - Placeholder email pattern (placeholder-{uuid}@discovery.internal)
    - Upsert-safe Person creation with PersonWorkspace junction
    - Sentinel provider value ("waterfall") for enrichment queue
key_files:
  created:
    - src/lib/discovery/promotion.ts
  modified:
    - src/lib/enrichment/types.ts
decisions:
  - "waterfall sentinel value: enrichment cron handler calls enrichEmail() for all person jobs regardless of provider value; 'waterfall' is just a semantic label"
  - "promotedAt set only on promoted records (not duplicates): duplicates are free for quota counting — quota function filters by promotedAt date window"
  - "Placeholder email pattern: placeholder-{uuid}@discovery.internal used when dp.email is null so Person.email unique constraint is satisfied"
  - "Fuzzy match threshold: 0.85 Levenshtein similarity chosen for name+company leg — high enough to avoid false positives while catching typos/variations"
  - "Leg 3 only fires when firstName + lastName + companyDomain all present: prevents high false-positive rate on partial data"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-04"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 17 Plan 01: Deduplication and Promotion Engine Summary

**One-liner:** Three-leg dedup engine (email exact, LinkedIn URL exact, Levenshtein 0.85 fuzzy) that promotes staged DiscoveredPerson records to Person table and enqueues waterfall enrichment.

## What Was Built

### Task 1: Add "waterfall" to Provider type
Added `"waterfall"` as a sentinel value to the `Provider` union type in `src/lib/enrichment/types.ts`. This allows callers to enqueue enrichment jobs for promoted leads using a semantically meaningful label. The enrichment cron handler (`/api/enrichment/jobs/process`) already calls `enrichEmail()` for all person-type jobs regardless of the provider value, so "waterfall" is purely a label with no special routing needed.

### Task 2: Create promotion.ts with dedup, promotion, and enrichment trigger
Created `src/lib/discovery/promotion.ts` (330 lines) implementing the full dedup-promote-enrich pipeline.

**Core exports:**
- `PromotionResult` interface — promoted count, duplicate count, sample names, promoted IDs, enrichment job ID
- `deduplicateAndPromote(workspaceSlug, runIds)` — main function, fetches staged records and processes them
- `levenshteinDistance(a, b)` — hand-rolled DP implementation (~25 lines), no external dependency
- `stringSimilarity(a, b)` — normalized 0.0–1.0 similarity using Levenshtein

**Three-leg dedup logic:**
1. **Leg 1 (email exact):** `prisma.person.findUnique({ where: { email } })` — skips null and placeholder emails
2. **Leg 2 (LinkedIn URL exact):** `prisma.person.findFirst({ where: { linkedinUrl } })` — only when linkedinUrl present
3. **Leg 3 (fuzzy name+company):** Queries up to 100 people at same `companyDomain`, computes full-name similarity — only fires when `firstName + lastName + companyDomain` all present

**Promotion flow:**
- Non-duplicates: upsert Person + upsert PersonWorkspace, set `status='promoted'` and `promotedAt=now()`
- Duplicates: set `status='duplicate'` and `personId` — `promotedAt` intentionally left null (free for quota)
- After processing: enqueue `EnrichmentJob` with `provider='waterfall'` and `chunkSize=25` for all promoted IDs

**Placeholder email pattern:** `placeholder-{uuid}@discovery.internal` — used when `dp.email` is null so the `Person.email` unique constraint is satisfied.

## Deviations from Plan

None — plan executed exactly as written.

The plan's correction note about `promotedAt` handling was implemented correctly: `promotedAt` is set only on `promoted` records, not `duplicate` records, so the quota function's `promotedAt` date filter only counts promoted leads.

## Verification Results

1. `npx tsc --noEmit` — passes with no type errors
2. `src/lib/discovery/promotion.ts` exports `deduplicateAndPromote`, `PromotionResult`, `levenshteinDistance`, `stringSimilarity`
3. `src/lib/enrichment/types.ts` Provider type includes `"waterfall"`
4. Three-leg dedup handles email exact, LinkedIn URL exact, and name+company fuzzy
5. Promotion creates both Person and PersonWorkspace records (upsert-safe)
6. Enrichment is enqueued (not run inline) via `enqueueJob()`

## Self-Check: PASSED
