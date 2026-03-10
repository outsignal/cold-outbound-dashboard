---
phase: 26-cross-workspace-benchmarking-icp-calibration
plan: 01
subsystem: api
tags: [analytics, benchmarks, icp, signals, prisma, raw-sql]

requires:
  - phase: 24-reply-analytics-engine
    provides: CachedMetrics campaign_snapshot data and aggregation patterns
  - phase: 23-reply-classification-pipeline
    provides: Reply model with intent/sentiment classification
provides:
  - Industry benchmark reference bands for 6 verticals
  - Reference bands API (workspace vs global vs industry)
  - ICP calibration API (score buckets, threshold recommendation)
  - Signal effectiveness API (ranked signal types, signal vs static comparison)
affects: [26-02, 28-hub-dashboard]

tech-stack:
  added: []
  patterns: [raw-sql-cross-join-for-icp-reply-correlation, bigint-conversion-from-raw-sql, campaign-snapshot-dedup-pattern]

key-files:
  created:
    - src/lib/analytics/industry-benchmarks.ts
    - src/app/api/analytics/benchmarks/reference-bands/route.ts
    - src/app/api/analytics/benchmarks/icp-calibration/route.ts
    - src/app/api/analytics/benchmarks/signal-effectiveness/route.ts
  modified: []

key-decisions:
  - "Raw SQL ($queryRawUnsafe) for ICP calibration -- Prisma cannot express cross-model JOIN on email+workspace for grouped bucket aggregation"
  - "Interested count sourced from Reply table intent field rather than CachedMetrics snapshot -- more accurate for per-signal-type breakdown"
  - "Bounce rate treated as normal metric in reference bands -- low/avg/high where higher is worse, UI handles inverted display"

patterns-established:
  - "Benchmark API pattern: workspace filter + global toggle + structured empty state response"
  - "ICP bucket analysis: 5 buckets (0-20 through 81-100), peak-relative dropoff for threshold recommendation"

requirements-completed: [BENCH-01, BENCH-02, BENCH-03, BENCH-04, BENCH-05]

duration: 3min
completed: 2026-03-10
---

# Phase 26 Plan 01: Benchmarking Data Layer Summary

**Industry benchmark constants for 6 verticals plus 3 analytics API endpoints for reference bands, ICP calibration, and signal effectiveness**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-10T10:16:38Z
- **Completed:** 2026-03-10T10:19:46Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Typed industry benchmark reference bands for all 6 client verticals with LinkedIn benchmarks
- Reference bands API returning workspace metrics vs global averages vs industry bands with channel awareness
- ICP calibration API with raw SQL cross-join for score-to-outcome correlation and threshold recommendation with confidence levels
- Signal effectiveness API with ranked signal types and signal vs static campaign comparison multipliers

## Task Commits

Each task was committed atomically:

1. **Task 1: Industry benchmarks constants and reference bands API** - `278ed91` (feat)
2. **Task 2: ICP calibration and signal effectiveness API endpoints** - `552522a` (feat)

## Files Created/Modified
- `src/lib/analytics/industry-benchmarks.ts` - Typed benchmark constants for 6 verticals + defaults + LinkedIn benchmarks
- `src/app/api/analytics/benchmarks/reference-bands/route.ts` - Workspace metrics vs global avg vs industry bands
- `src/app/api/analytics/benchmarks/icp-calibration/route.ts` - ICP score buckets with threshold recommendation
- `src/app/api/analytics/benchmarks/signal-effectiveness/route.ts` - Signal type rankings and signal vs static comparison

## Decisions Made
- Used raw SQL ($queryRawUnsafe) for ICP calibration -- Prisma cannot express the cross-model JOIN on email+workspace needed for grouped bucket aggregation
- Sourced interested counts from Reply table intent field rather than CachedMetrics snapshot for per-signal-type accuracy
- Bounce rate kept as standard metric in reference bands (low/avg/high where higher is worse) -- UI will handle inverted display logic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 benchmark API endpoints ready for Phase 26 Plan 02 (UI components)
- Endpoints handle empty/sparse data gracefully with structured messages
- Channel-aware metric selection ready for UI gauge display logic

---
*Phase: 26-cross-workspace-benchmarking-icp-calibration*
*Completed: 2026-03-10*
