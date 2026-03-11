---
phase: 31-auto-rotation-engine
plan: "02"
subsystem: email-health
tags: [cron, notifications, slack, email, audit, bounce-monitor, emailbison]

requires:
  - phase: 31-01
    provides: EmailHealthEvent model, runBounceMonitor state machine, replaceSender, EmailBounceStatus type
provides:
  - Bounce monitor cron endpoint at /api/cron/bounce-monitor (4-hour schedule)
  - Sender health transition notifications (Slack ops channel + admin email)
  - Manual override API at POST /api/senders/[id]/email-health-override
  - notifySenderHealthTransition with full audit trail via audited()
affects: [domain-health, senders, notification-audit, cron-jobs]

tech-stack:
  added: []
  patterns:
    - Transition-only gating — cron route calls notifySenderHealthTransition only when transitioned=true
    - audited() wrapper on all Slack + email sends for full audit trail
    - replaceSender lookup in cron route for critical transitions before notification
    - Manual override creates EmailHealthEvent with reason='manual', resets consecutiveHealthyChecks, no locking

key-files:
  created:
    - src/lib/domain-health/bounce-notifications.ts
    - src/app/api/cron/bounce-monitor/route.ts
    - src/app/api/senders/[id]/email-health-override/route.ts
  modified:
    - src/lib/domain-health/bounce-monitor.ts

key-decisions:
  - "Notification gating is in cron route (not notifySenderHealthTransition) — notification function always fires when called"
  - "runBounceMonitor transitions include workspaceSlug so replaceSender can find workspace-scoped candidates"
  - "Manual override resets consecutiveHealthyChecks to 0 — next cron resumes auto-evaluation without any lock"
  - "Replacement sender lookup happens in cron route (not bounce-monitor) to keep state machine pure"

patterns-established:
  - "statusEmoji/statusLabel pattern for consistent status display across notifications"
  - "Recovery notifications distinguished from escalation notifications via severity comparison"
  - "Cron route wraps entire handler in try/catch, returns 500 with message on fatal error"

requirements-completed: [ROTATE-01, ROTATE-05]

duration: 2m 31s
completed: 2026-03-11
---

# Phase 31 Plan 02: Bounce Monitor Cron + Notifications Summary

**4-hour bounce monitor cron endpoint wired to notifySenderHealthTransition (Slack + email) with admin manual override API and full audit trail.**

## Performance

- **Duration:** 2m 31s
- **Started:** 2026-03-11T12:18:00Z
- **Completed:** 2026-03-11T12:20:31Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Bounce monitor cron endpoint ready for cron-job.org registration (4-hour schedule, CRON_SECRET auth)
- Slack + email notifications fire on status transitions only (escalation states what system did, recovery informs admin)
- Critical transition notifications include replacement sender lookup (or "no replacement available" warning)
- Admin manual override API creates EmailHealthEvent audit trail, resets counter, resumes auto-evaluation

## Task Commits

Each task was committed atomically:

1. **Task 1: Bounce notification functions for sender health transitions** - `c840588` (feat)
2. **Task 2: Bounce monitor cron route + manual override API** - `5e90abc` (feat)

**Plan metadata:** (final commit hash to be recorded)

## Files Created/Modified

- `src/lib/domain-health/bounce-notifications.ts` - notifySenderHealthTransition, statusEmoji, statusLabel helpers, full Slack + email message builders
- `src/app/api/cron/bounce-monitor/route.ts` - GET cron handler, delegates to runBounceMonitor, calls replaceSender + notifySenderHealthTransition per transition
- `src/app/api/senders/[id]/email-health-override/route.ts` - POST admin override, creates EmailHealthEvent reason='manual', resets consecutiveHealthyChecks
- `src/lib/domain-health/bounce-monitor.ts` - Added workspaceSlug to transitions array (Rule 1 fix)

## Decisions Made

- Notification gating lives in cron route: `notifySenderHealthTransition` always fires when called — simple, testable separation of concerns
- `workspaceSlug` added to `runBounceMonitor` transitions: required so `replaceSender` can find workspace-scoped candidates in the cron route
- Manual override sets `consecutiveHealthyChecks = 0` and no lock field — keeps the state machine simple, next run evaluates normally

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added workspaceSlug to runBounceMonitor transitions array**
- **Found during:** Task 2 (bounce monitor cron route)
- **Issue:** `runBounceMonitor` transitions only included `{ senderEmail, from, to, reason }` — the cron route needs `workspaceSlug` to call `replaceSender()` with the correct workspace scope
- **Fix:** Added `workspaceSlug` to transitions array type signature and to each push call in `runBounceMonitor`
- **Files modified:** `src/lib/domain-health/bounce-monitor.ts`
- **Verification:** TypeScript compiles clean, `replaceSender` receives correct workspaceSlug
- **Committed in:** `5e90abc` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug — missing data needed by caller)
**Impact on plan:** Essential fix — without workspaceSlug the replacement sender lookup would always search the wrong or empty workspace. No scope creep.

## Issues Encountered

None.

## User Setup Required

Register bounce monitor on cron-job.org:
- **URL:** `https://admin.outsignal.ai/api/cron/bounce-monitor`
- **Schedule:** Every 4 hours — 0:00, 4:00, 8:00, 12:00, 16:00, 20:00 UTC
- **Header:** `Authorization: Bearer {CRON_SECRET}`

## Next Phase Readiness

- Phase 31 is complete (Plan 01: state machine, Plan 02: cron + notifications + override)
- Phase 32 ready to execute: bounce snapshot ingestion from EmailBison API
- cron-job.org registration can be done anytime after deployment

---
## Self-Check: PASSED

- [x] `src/lib/domain-health/bounce-notifications.ts` created
- [x] `src/app/api/cron/bounce-monitor/route.ts` created
- [x] `src/app/api/senders/[id]/email-health-override/route.ts` created
- [x] `src/lib/domain-health/bounce-monitor.ts` modified (workspaceSlug added to transitions)
- [x] Commits: c840588 (Task 1), 5e90abc (Task 2)
- [x] `npx tsc --noEmit`: zero errors

*Phase: 31-auto-rotation-engine*
*Completed: 2026-03-11*
