---
phase: 25-copy-performance-analysis
plan: 02
subsystem: api
tags: [analytics, copy-analysis, correlations, subject-lines, templates]

# Dependency graph
requires:
  - phase: 25-01
    provides: "BodyElements interface and body_elements CachedMetrics rows"
  - phase: 24-01
    provides: "CachedMetrics model with campaign_snapshot data"
provides:
  - "GET /api/analytics/copy/subject-lines — ranked subject lines with open/reply rates"
  - "GET /api/analytics/copy/correlations — element-to-reply-rate multiplier cards"
  - "GET /api/analytics/copy/top-templates — top performing templates by composite score"
affects: [25-03, 28-hub-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: ["weighted-average aggregation for deduplication", "composite score ranking", "multiplier computation with div-by-zero guard"]

key-files:
  created:
    - src/app/api/analytics/copy/subject-lines/route.ts
    - src/app/api/analytics/copy/correlations/route.ts
    - src/app/api/analytics/copy/top-templates/route.ts
  modified: []

key-decisions:
  - "Campaign-level emailsSent used as denominator for step-level reply rates (step-level sent not available)"
  - "Global view deduplicates subject lines case-insensitively with weighted-average aggregation"
  - "Composite score formula: (interestedRate * 0.6) + (replyRate * 0.4) for template ranking"
  - "Low confidence threshold set at 20 total samples (with + without)"

patterns-established:
  - "Copy analytics routes follow same auth + CachedMetrics query pattern as campaigns/route.ts"
  - "Multiplier computation: weighted reply rate WITH element / WITHOUT element, null if either bucket empty"

requirements-completed: [COPY-01, COPY-03, COPY-04, COPY-05]

# Metrics
duration: 3min
completed: 2026-03-10
---

# Phase 25 Plan 02: Copy Analysis API Routes Summary

**Three GET endpoints for subject line ranking, element correlation multipliers with dual baselines, and composite-score-ranked top templates**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-10T09:26:44Z
- **Completed:** 2026-03-10T09:30:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Subject lines API with global (deduplicated) and per-campaign views, weighted-average rates
- Correlations API computing multiplier per body element with global + vertical baselines, CTA subtype breakdown
- Top templates API ranking by composite score with full body text and element tags
- All routes enforce minimum 10 sends threshold and support workspace/vertical filters

## Task Commits

Each task was committed atomically:

1. **Task 1: Subject lines ranking API route** - `e87148c` (feat)
2. **Task 2: Correlations and top templates API routes** - `6e77fa3` (feat)

## Files Created/Modified
- `src/app/api/analytics/copy/subject-lines/route.ts` - Ranked subject lines with open rate, reply rate, volume; global/per-campaign views
- `src/app/api/analytics/copy/correlations/route.ts` - Element multiplier cards with dual baselines, low-confidence flagging, CTA subtype breakdown
- `src/app/api/analytics/copy/top-templates/route.ts` - Top N templates by composite score with element tags and full body text

## Decisions Made
- Campaign-level emailsSent used as denominator for step-level reply rates since step-level sent counts are not available from EmailBison
- Global view deduplicates subject lines case-insensitively with weighted-average aggregation by send volume
- Composite score formula weights interested rate 60% and reply rate 40%
- Low confidence flag when total sample (with + without) is under 20 steps

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three copy analysis API endpoints ready for Plan 03 (Copy tab UI)
- Body elements + campaign snapshots power all computations via CachedMetrics

---
*Phase: 25-copy-performance-analysis*
*Completed: 2026-03-10*
