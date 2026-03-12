---
phase: 42-remaining-cron-lift-and-shift
plan: 04
subsystem: infra
tags: [trigger.dev, campaigns, deploy, background-jobs]

# Dependency graph
requires:
  - phase: 42-remaining-cron-lift-and-shift
    provides: Trigger.dev infrastructure and task patterns established in earlier phases
provides:
  - campaign-deploy Trigger.dev on-demand task with retry and observability
  - deploy route refactored from fire-and-forget after() to await tasks.trigger()
affects: [campaigns, deploy, trigger-tasks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "On-demand Trigger.dev task pattern: task() with id, maxDuration, retry config, payload type, run() handler"
    - "Route-side triggering: await tasks.trigger('task-id', payload) from @trigger.dev/sdk/v3"

key-files:
  created:
    - trigger/campaign-deploy.ts
  modified:
    - src/app/api/campaigns/[id]/deploy/route.ts

key-decisions:
  - "campaign-deploy has no queue — infrequent deploys (a few per day), no concurrency concern"
  - "maxDuration 300s on task mirrors original route maxDuration — generous for EmailBison API calls"
  - "await tasks.trigger() used (not void) — ensures task is registered before route responds"
  - "executeDeploy and retryDeployChannel imports removed from route — task owns them exclusively"

patterns-established:
  - "On-demand task pattern: use task() not schedules.task() for non-scheduled background work"
  - "Route refactor pattern: validate -> create DB record -> await tasks.trigger() -> return response"

requirements-completed: [DECOMM-03]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 42 Plan 04: Campaign Deploy Trigger.dev Task Summary

**campaign-deploy Trigger.dev on-demand task replaces after() fire-and-forget in deploy route, adding retry, observability, and no timeout constraint for EmailBison API calls**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T18:50:34Z
- **Completed:** 2026-03-12T18:52:32Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `trigger/campaign-deploy.ts` — on-demand task handling both fresh deploy and channel retry paths based on payload
- Refactored deploy route to replace both `after()` calls with `await tasks.trigger('campaign-deploy', ...)`
- Route is now simplified: validate -> create CampaignDeploy record -> trigger task -> return response

## Task Commits

Each task was committed atomically:

1. **Task 1: Create campaign-deploy Trigger.dev task** - `83a4724` (feat)
2. **Task 2: Refactor deploy route to use tasks.trigger()** - `6dc4f1f` (feat)

## Files Created/Modified
- `trigger/campaign-deploy.ts` - On-demand Trigger.dev task; handles executeDeploy (fresh) and retryDeployChannel (retry) paths; maxDuration 300s, retry maxAttempts 2
- `src/app/api/campaigns/[id]/deploy/route.ts` - Replaced after() calls with await tasks.trigger(); removed after + executeDeploy + retryDeployChannel imports; added tasks import from @trigger.dev/sdk/v3

## Decisions Made
- No queue for campaign-deploy — infrequent operation, no concurrency risk
- await tasks.trigger() (not void/fire-and-forget) — ensures task is registered in Trigger.dev before response returns; call is fast (<100ms)
- executeDeploy/retryDeployChannel removed from route — task exclusively owns the execution logic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - tsc checks showed only pre-existing node_modules type errors (same as all other trigger files), no errors in our code.

## User Setup Required
None - no external service configuration required. The campaign-deploy task will be picked up by Trigger.dev on next deploy.

## Next Phase Readiness
- campaign-deploy task ready for Trigger.dev deployment
- Deploy route no longer has after() fire-and-forget — all deploy execution is now observable and retryable
- Ready for remaining Phase 42 plans (bounce-snapshots, deliverability-digest, inbox-check, sync-senders)

---
*Phase: 42-remaining-cron-lift-and-shift*
*Completed: 2026-03-12*
