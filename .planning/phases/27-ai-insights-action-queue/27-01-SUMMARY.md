---
phase: 27-ai-insights-action-queue
plan: 01
subsystem: ai, analytics
tags: [ai-sdk, generateObject, zod, prisma, cron, anthropic, haiku]

# Dependency graph
requires:
  - phase: 24-campaign-analytics-pipeline
    provides: CachedMetrics campaign_snapshot data
  - phase: 23-reply-classification-pipeline
    provides: Reply model with intent/sentiment/objection classification
provides:
  - Insight Prisma model with lifecycle fields
  - InsightSchema Zod schema for structured AI output
  - generateInsights pipeline reading pre-computed analytics
  - Deduplication with 2-week dismissed window
  - Cron endpoint for weekly insight generation
affects: [27-02 (API routes), 27-03 (Insights tab UI)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "generateObject with Zod schema for structured insight output"
    - "Dedup key pattern: category:actionType:entityId"
    - "Week-over-week comparison from CachedMetrics snapshots"

key-files:
  created:
    - src/lib/insights/types.ts
    - src/lib/insights/generate.ts
    - src/lib/insights/dedup.ts
    - src/app/api/cron/generate-insights/route.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "z.record(z.string(), z.string()) for action params -- Zod v3 requires explicit key type"
  - "No maxTokens param on generateObject -- AI SDK limitation per decision 24-01"
  - "Latest snapshot per campaign for week-over-week (EB stats cumulative per decision 24-02)"

patterns-established:
  - "Insight generation pipeline: gather pre-computed data -> build structured prompt -> generateObject -> dedup -> persist"

requirements-completed: [INSIGHT-01, INSIGHT-02]

# Metrics
duration: 8min
completed: 2026-03-10
---

# Phase 27 Plan 01: Insight Model & AI Generation Pipeline Summary

**Insight Prisma model with AI generation pipeline using generateObject + Haiku, deduplication with 2-week dismissed window, and weekly cron endpoint**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-10T12:22:11Z
- **Completed:** 2026-03-10T12:30:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Insight model added to Prisma schema with full lifecycle fields, dedup key, and 3 indexes
- AI generation pipeline reads CachedMetrics snapshots + Reply classifications, builds structured prompt with week-over-week comparison
- Deduplication prevents re-generating dismissed insights within 2-week window
- Cron endpoint supports single workspace (?workspace=) and all-workspaces mode with Bearer auth

## Task Commits

Each task was committed atomically:

1. **Task 1: Insight model, types, and dedup module** - `16b7f0e` (feat)
2. **Task 2: AI generation pipeline and cron endpoint** - `5e4a24a` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added Insight model with lifecycle, dedup, and audit fields
- `src/lib/insights/types.ts` - InsightCategory, ActionType, InsightStatus unions, Zod schema, color maps
- `src/lib/insights/dedup.ts` - buildDedupKey and filterDuplicates with 14-day dismissed window query
- `src/lib/insights/generate.ts` - generateInsights pipeline: data gathering, prompt building, AI call, dedup, persist
- `src/app/api/cron/generate-insights/route.ts` - Cron endpoint with validateCronSecret auth

## Decisions Made
- Used `z.record(z.string(), z.string())` for action params (Zod v3 requires explicit key type)
- No maxTokens param on generateObject (AI SDK limitation per decision 24-01)
- Latest snapshot per campaign used for averages (EB stats are cumulative per decision 24-02)
- Prompt includes confidence threshold guidance (HIGH: 50+ points + >20% change, MEDIUM: 20-49 or 10-20%, LOW: <20 or <10%)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed z.record type error in InsightSchema**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** `z.record(z.string())` fails in this Zod version -- requires two args
- **Fix:** Changed to `z.record(z.string(), z.string())`
- **Files modified:** src/lib/insights/types.ts
- **Verification:** TypeScript compilation passes with zero errors in project files
- **Committed in:** 5e4a24a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type fix required for correctness. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Cron endpoint uses existing CRON_SECRET.

## Next Phase Readiness
- Insight model and generation pipeline ready for Plan 02 (API routes for listing, approving, dismissing, snoozing)
- Cron endpoint ready for cron-job.org setup (recommended: one entry per workspace, Monday 7am UTC staggered)

---
*Phase: 27-ai-insights-action-queue*
*Completed: 2026-03-10*
