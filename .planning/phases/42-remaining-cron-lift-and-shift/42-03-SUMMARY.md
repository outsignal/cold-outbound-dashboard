---
phase: 42-remaining-cron-lift-and-shift
plan: 03
subsystem: infra
tags: [trigger.dev, scheduled-tasks, cron, inbox-health, linkedin, invoices, enrichment]

# Dependency graph
requires:
  - phase: 42-remaining-cron-lift-and-shift
    provides: Phase context — monolithic inbox-health cron identified for decomposition
  - phase: 38-trigger-foundation
    provides: Trigger.dev SDK, schedules.task pattern, project infrastructure
provides:
  - inbox-check Trigger.dev scheduled task (daily 6am UTC)
  - inbox-sender-health Trigger.dev scheduled task (daily 6am UTC)
  - inbox-linkedin-maintenance Trigger.dev scheduled task (every 6h)
  - invoice-processor Trigger.dev scheduled task (daily 7am UTC)
  - enrichment-job-processor Trigger.dev scheduled task (daily 6am UTC)
affects:
  - 42-remaining-cron-lift-and-shift
  - vercel.json cron removal (enrichment-job-processor replaces old Vercel cron)
  - cron-job.org inbox-health/check job retirement

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "schedules.task for recurring jobs: id, cron, maxDuration, retry config — no queue needed for I/O-only tasks"
    - "PrismaClient at module scope (not inside run()) — avoids connection pool exhaustion"
    - "Loop-until-done for enrichment: processNextChunk in while loop until null — processes all pending chunks per run vs one chunk per Vercel invocation"

key-files:
  created:
    - trigger/inbox-check.ts
    - trigger/inbox-sender-health.ts
    - trigger/inbox-linkedin-maintenance.ts
    - trigger/invoice-processor.ts
    - trigger/enrichment-job-processor.ts
  modified: []

key-decisions:
  - "inbox-linkedin-maintenance runs every 6h (not daily) — LinkedIn warmup/acceptance rates benefit from more frequent updates"
  - "invoice-processor runs at 7am UTC (not 6am) — staggered after inbox-check tasks to avoid simultaneous DB pressure"
  - "enrichment-job-processor loops until done — 300s Trigger.dev budget allows processing all pending chunks; old Vercel cron processed only one chunk per daily invocation"
  - "inbox-sender-health includes refreshStaleSessions — logically belongs with sender health assessment, not a separate task"
  - "No queue on any of these 5 tasks — all I/O only (no Anthropic or EmailBison calls), no concurrency limiting needed"

patterns-established:
  - "Monolithic cron decomposition: split by concern, each task independently retriable with its own schedule"

requirements-completed: [CRON-10]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 42 Plan 03: Remaining Cron Lift-and-Shift — Inbox Health Split + Enrichment Migration Summary

**Monolithic inbox-health route decomposed into 4 independent Trigger.dev scheduled tasks, plus enrichment job processor migrated from Vercel cron with loop-until-done improvement**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-12T18:50:42Z
- **Completed:** 2026-03-12T18:53:22Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Split the 60s monolithic inbox-health check into 4 independent tasks (each with 300s budget, own retry)
- Migrated enrichment job processor from Vercel-native cron to Trigger.dev with loop-until-done improvement
- All 5 files compile cleanly against project tsconfig (skipLibCheck handles trigger.dev library issues)
- Fixed enrichFn callback type to match actual processNextChunk signature (provider field was missing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create inbox-check and inbox-sender-health tasks** - `d04faf4` (feat)
2. **Task 2: Create inbox-linkedin-maintenance, invoice-processor, and enrichment-job-processor tasks** - `4180c76` (feat)

## Files Created/Modified
- `trigger/inbox-check.ts` - Daily 6am UTC: checkAllWorkspaces + notifyInboxDisconnect + notify (disconnect/reconnect events)
- `trigger/inbox-sender-health.ts` - Daily 6am UTC: runSenderHealthCheck + notifySenderHealth + sendSenderHealthDigest + refreshStaleSessions
- `trigger/inbox-linkedin-maintenance.ts` - Every 6h: PrismaClient module-scope, per-sender progressWarmup + updateAcceptanceRate + recoverStuckActions + expireStaleActions
- `trigger/invoice-processor.ts` - Daily 7am UTC: generateDueInvoices + markAndNotifyOverdueInvoices + alertUnpaidBeforeRenewal
- `trigger/enrichment-job-processor.ts` - Daily 6am UTC: PrismaClient module-scope, processNextChunk loop until all pending chunks complete

## Decisions Made
- inbox-linkedin-maintenance runs every 6h (cron `0 */6 * * *`) not daily — LinkedIn warmup/acceptance rates benefit from more frequent processing
- invoice-processor at 7am UTC (staggered from the 6am cluster) to avoid simultaneous DB pressure
- enrichment-job-processor wraps processNextChunk in a while loop — previously Vercel cron processed one chunk per day, now all pending chunks are processed in a single 300s run
- refreshStaleSessions included in inbox-sender-health (not a standalone task) — logically tied to sender health assessment
- No queue on any task — these are I/O-only tasks with no Anthropic/EmailBison calls

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed enrichFn callback type signature**
- **Found during:** Task 2 (enrichment-job-processor)
- **Issue:** Plan documented `processNextChunk` callback as `(entityId, job: { entityType, workspaceSlug })` but actual signature includes `provider: string` field — TypeScript error TS2345
- **Fix:** Updated enrichFn type to `{ entityType: string; provider: string; workspaceSlug?: string | null }`
- **Files modified:** trigger/enrichment-job-processor.ts
- **Verification:** `npx tsc --noEmit` passes with no trigger/ errors
- **Committed in:** 4180c76 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type bug)
**Impact on plan:** Essential type correctness fix. No scope creep.

## Issues Encountered
- `npx tsc --noEmit trigger/file.ts` (file-specific) doesn't resolve `@/` path aliases — must run `npx tsc --noEmit` (project-wide) to validate. Existing project pattern confirmed.

## User Setup Required
None - no external service configuration required for file creation. Tasks will be registered when next deployed via `npx trigger.dev@latest deploy`.

## Next Phase Readiness
- All 5 task files exist and compile cleanly
- Ready for the final step: remove the now-redundant Vercel cron entry for enrichment, register all tasks with Trigger.dev, and retire the cron-job.org inbox-health/check job

---
*Phase: 42-remaining-cron-lift-and-shift*
*Completed: 2026-03-12*
