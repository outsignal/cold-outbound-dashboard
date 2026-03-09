---
phase: 23-reply-storage-classification
plan: 01
subsystem: database, api
tags: [prisma, classification, llm, haiku, zod, ai-sdk]

# Dependency graph
requires: []
provides:
  - Reply model in database with classification, override, and outbound snapshot fields
  - classifyReply() function using generateObject + Claude Haiku 4.5
  - stripHtml() utility for HTML-to-plain-text conversion
  - Intent, Sentiment, ObjectionSubtype type definitions and display constants
affects: [23-02-webhook-integration, 23-03-api-routes, 23-04-ui, 24-per-step-analytics, 25-copy-analysis]

# Tech tracking
tech-stack:
  added: []
  patterns: [classification-pipeline-generateObject, reply-model-soft-links]

key-files:
  created:
    - src/lib/classification/types.ts
    - src/lib/classification/classify-reply.ts
    - src/lib/classification/strip-html.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Used prisma db push instead of migrate dev due to existing migration drift — no data loss, schema synced"
  - "No FK constraints on Reply model — consistent with project convention for cross-model soft links"
  - "Single LLM call for intent + sentiment + objectionSubtype — cheaper and more consistent than separate calls"

patterns-established:
  - "Classification pipeline: generateObject + Zod enum schema + Claude Haiku 4.5 for structured LLM output"
  - "Reply dedup via emailBisonReplyId unique constraint — works across webhook and poll sources"

requirements-completed: [REPLY-02, REPLY-03, REPLY-04]

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 23 Plan 01: Reply Model & Classification Foundation Summary

**Reply model with 30+ fields (classification, override tracking, outbound snapshot) plus classifyReply() using generateObject + Haiku for 9-intent taxonomy**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T18:12:37Z
- **Completed:** 2026-03-09T18:14:56Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Reply model added to database with all columns, indexes, and unique constraint for dedup
- Classification function ready to call from webhook handler and poll-replies cron
- Type definitions with display labels and Tailwind color maps exported for UI components

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Reply model and run migration** - `3988b06` (feat)
2. **Task 2: Create classification types, classifyReply function, and stripHtml utility** - `6d23dbd` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added Reply model with 30+ fields, 7 indexes, unique constraint on emailBisonReplyId
- `src/lib/classification/types.ts` - Intent (9), Sentiment (3), ObjectionSubtype (6) enums with labels and color maps
- `src/lib/classification/classify-reply.ts` - classifyReply() using generateObject + Haiku with detailed prompt
- `src/lib/classification/strip-html.ts` - HTML to plain text converter preserving line breaks

## Decisions Made
- Used `prisma db push` instead of `prisma migrate dev` because migration history was out of sync with database (known project state). No data loss, schema synced correctly.
- No FK constraints on personId, campaignId, webhookEventId — consistent with project convention for soft links.
- Single LLM call classifies intent + sentiment + objectionSubtype + summary together — 2x cheaper and more consistent than separate calls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used prisma db push instead of migrate dev**
- **Found during:** Task 1 (Create Reply model and run migration)
- **Issue:** `prisma migrate dev` detected drift between migration history and actual database schema, requiring a destructive reset
- **Fix:** Used `prisma db push` which safely applies schema changes without requiring migration history sync
- **Files modified:** prisma/schema.prisma (schema applied to database)
- **Verification:** `prisma validate` passes, Prisma client regenerated successfully
- **Committed in:** 3988b06 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Migration approach change was necessary to avoid destructive database reset. No scope creep.

## Issues Encountered
None beyond the migration drift handled above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Reply model is in the database, ready for webhook integration (plan 02)
- classifyReply() is importable and ready for use in webhook handler and poll-replies cron
- Type definitions exported for API routes (plan 03) and UI components (plan 04)
- No blockers for subsequent plans

---
*Phase: 23-reply-storage-classification*
*Completed: 2026-03-09*
