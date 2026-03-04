---
phase: 18-signal-monitoring-infrastructure
plan: 01
subsystem: database
tags: [prisma, postgresql, signal-monitoring, api, workspace-config]

# Dependency graph
requires:
  - phase: 15-foundation
    provides: Workspace model with enabledModules/quota pattern; DailyCostTotal cost tracking pattern
provides:
  - SignalEvent model — persists detected signals with dedup via @@unique([source, externalId])
  - SignalDailyCost model — per-workspace daily signal API spend tracking
  - SeenSignalUrl model — dedup table for social post URLs
  - Workspace signal config fields — signalDailyCapUsd, signalEnabledTypes, signalCompetitors, signalWatchlistDomains
  - GET + PATCH /api/workspaces/[slug]/signals — admin config endpoint
affects:
  - 18-02 (signal worker reads Workspace signal config, writes SignalEvent, uses SignalDailyCost)
  - 18-03 (signal dashboard reads SignalEvent)
  - 18-04 (any further signal plans reading these models)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Soft domain link on SignalEvent.companyDomain (no FK, consistent with Person.companyDomain)"
    - "JSON array stored as stringified JSON, parsed on read (consistent with Workspace.enabledModules)"
    - "Per-workspace cost tracking model (SignalDailyCost) parallel to global DailyCostTotal"
    - "@@unique([source, externalId]) for provider-level signal dedup"

key-files:
  created:
    - src/app/api/workspaces/[slug]/signals/route.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "SignalEvent uses @@unique([source, externalId]) for dedup — allows NULL externalId for providers that don't return IDs"
  - "SignalDailyCost is per-workspace (not global like DailyCostTotal) — each workspace has independent spend cap"
  - "SeenSignalUrl has no workspace scoping — social post URLs are globally deduplicated across workspaces"
  - "No auth guard on /api/workspaces/[slug]/signals — consistent with all other workspace API routes (15-04 decision)"
  - "signalEnabledTypes validated against 6-value allowlist with descriptive error message listing valid values"

patterns-established:
  - "Signal route pattern: GET parses JSON fields, PATCH validates + JSON.stringify before DB write"

requirements-completed: [SIG-08, SIG-09]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 18 Plan 01: Signal Monitoring Infrastructure — Schema + Config API Summary

**Three Prisma models (SignalEvent, SignalDailyCost, SeenSignalUrl) + four Workspace signal config columns pushed to Neon database, plus GET/PATCH API endpoint for workspace signal settings**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-04T20:13:20Z
- **Completed:** 2026-03-04T20:15:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added SignalEvent model with rawResponse audit trail, provider dedup, TTL fields, high-intent flag, and 4 composite indexes
- Added SignalDailyCost model for per-workspace signal API spend tracking with @@unique([workspaceSlug, date])
- Added SeenSignalUrl model for global social post URL dedup with seenAt for periodic cleanup
- Added 4 Workspace signal config columns with sensible defaults (dailyCap $5, empty JSON arrays)
- Pushed schema to Neon PostgreSQL — all 3 tables created successfully
- Created GET + PATCH /api/workspaces/[slug]/signals endpoint with full input validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Prisma models and Workspace fields** - `baab38f` (feat)
2. **Task 2: Create workspace signal settings API endpoint** - `c5a321b` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `prisma/schema.prisma` - Added SignalEvent, SignalDailyCost, SeenSignalUrl models + 4 Workspace signal fields
- `src/app/api/workspaces/[slug]/signals/route.ts` - GET + PATCH endpoint for workspace signal config

## Decisions Made
- SignalEvent uses `@@unique([source, externalId])` — allows NULL externalId for providers without stable IDs; dedup only fires when externalId is present
- SignalDailyCost is per-workspace (not shared like DailyCostTotal) — each workspace tracks its own signal spend independently against its own cap
- SeenSignalUrl has no workspace scoping — social post URLs are globally unique (same article shouldn't be processed twice regardless of workspace)
- No auth guard on the signals endpoint — consistent with all other workspace routes per the 15-04 admin-ui decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npx tsc --noEmit` run on the route file directly showed pre-existing node_modules type errors (Next.js 16 known issue with @types/react and webpack types) — not caused by this plan's changes. Running `tsc --noEmit` on the full project with `| grep -v node_modules` showed zero errors in project source files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 3 signal models are live in the database — Phase 18 Plan 02 (signal worker) can write SignalEvent and SignalDailyCost immediately
- Workspace signal config fields ready for worker to read (signalDailyCapUsd, signalEnabledTypes, signalCompetitors, signalWatchlistDomains)
- Admin can pre-configure signal settings for each workspace via the API before the worker goes live

---
*Phase: 18-signal-monitoring-infrastructure*
*Completed: 2026-03-04*
