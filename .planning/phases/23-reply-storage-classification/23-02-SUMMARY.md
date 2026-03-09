---
phase: 23-reply-storage-classification
plan: 02
subsystem: api
tags: [prisma, classification, webhook, cron, emailbison, llm]

# Dependency graph
requires:
  - phase: 23-reply-storage-classification (plan 01)
    provides: Reply model, classifyReply function, stripHtml utility, classification types
provides:
  - Reply persistence in webhook handler (upsert + classify inline)
  - Reply persistence in poll-replies cron (upsert + classify inline)
  - Retry-classification cron for failed classifications
  - Dedup across webhook and poll via emailBisonReplyId unique constraint
affects: [23-reply-storage-classification (plans 03-04), 24-reply-aggregation, 25-copy-analysis]

# Tech tracking
tech-stack:
  added: []
  patterns: [upsert-then-classify, try-catch-classification-with-retry, outbound-email-snapshot-lookup]

key-files:
  created:
    - src/app/api/cron/retry-classification/route.ts
  modified:
    - src/app/api/webhooks/emailbison/route.ts
    - src/app/api/cron/poll-replies/route.ts

key-decisions:
  - "Outbound email snapshot: webhook path looks up matching sequence step by position; poll path uses single-step campaign heuristic"
  - "WebhookEvent ID captured and linked to Reply record for audit trail"

patterns-established:
  - "Upsert-then-classify: always persist the Reply first, classify in try/catch, failed classifications get intent=null for retry cron"
  - "Outbound snapshot lookup: campaign emailSequence JSON parsed to find matching step for copy analysis context"

requirements-completed: [REPLY-01, REPLY-05]

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 23 Plan 02: Reply Ingestion Wiring Summary

**Reply persistence and LLM classification wired into webhook handler, poll-replies cron, and new retry-classification cron with emailBisonReplyId dedup**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T18:17:06Z
- **Completed:** 2026-03-09T18:19:39Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Webhook handler creates Reply records for all non-automated reply events (LEAD_REPLIED, LEAD_INTERESTED, UNTRACKED_REPLY_RECEIVED) with inline classification before notification
- Poll-replies cron creates Reply records with classification for every new reply, with single-step campaign outbound snapshot lookup
- New retry-classification cron at /api/cron/retry-classification processes up to 50 unclassified replies per run
- All three paths use prisma.reply.upsert with emailBisonReplyId for dedup across webhook and poll overlap

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire Reply persistence and classification into webhook handler** - `07611d7` (feat)
2. **Task 2: Wire Reply persistence into poll-replies cron and create retry-classification cron** - `86dc1cd` (feat)

## Files Created/Modified
- `src/app/api/webhooks/emailbison/route.ts` - Added Reply upsert + classification block between LinkedIn fast-track and notification, captures WebhookEvent ID
- `src/app/api/cron/poll-replies/route.ts` - Added Reply upsert + classification after status update and before notification
- `src/app/api/cron/retry-classification/route.ts` - New cron endpoint that retries classification on replies with null classifiedAt

## Decisions Made
- Webhook path looks up outbound email snapshot by matching campaign emailSequence step position to sequenceStep; poll path uses single-step campaign heuristic (if only 1 step, use it) since polled replies lack sequence_step_order
- WebhookEvent create result captured to link webhookEventId on Reply record for audit trail
- Classification runs inline (before notification) in both webhook and poll paths, with try/catch so failures never block notification delivery

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
Retry-classification cron needs to be registered on cron-job.org to run every 30 minutes at `https://admin.outsignal.ai/api/cron/retry-classification` with Bearer auth header.

## Next Phase Readiness
- All three ingestion paths (webhook, poll, retry) create/update Reply records with classification
- Ready for 23-03 (override endpoint) and 23-04 (dashboard integration)
- Outbound email snapshots stored for Phase 25 copy analysis

---
*Phase: 23-reply-storage-classification*
*Completed: 2026-03-09*
