---
phase: 27-ai-insights-action-queue
plan: 02
subsystem: api, notifications
tags: [prisma, insights, action-executor, slack, email, cron, audit-trail]

# Dependency graph
requires:
  - phase: 27-ai-insights-action-queue
    provides: Insight model, generateInsights pipeline, types, cron endpoint
provides:
  - Insights CRUD API (GET list, POST manual refresh, PATCH status management)
  - Action executor with before/after audit trail for all 4 action types
  - Weekly digest notification via Slack + email with audited() wrapper
affects: [27-03 (Insights tab UI)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Action executor pattern: switch on actionType, return {before, after, outcome} audit trail"
    - "CachedMetrics as persistent flag storage (copy_review_flag metric type)"
    - "Expired snooze auto-reactivation in GET query (snoozedUntil < now)"

key-files:
  created:
    - src/app/api/insights/route.ts
    - src/app/api/insights/[id]/route.ts
    - src/lib/insights/actions.ts
  modified:
    - src/lib/notifications.ts
    - src/app/api/cron/generate-insights/route.ts

key-decisions:
  - "All 4 action types execute on approve (admin confirms in UI before calling PATCH)"
  - "pause_campaign updates local campaign status only -- EmailBison API pause not available"
  - "ICP threshold and signal targeting actions record recommendations, not auto-modify prompts"
  - "copy_review_flag persisted as CachedMetrics entry for cross-feature visibility"
  - "Weekly digest sent from cron endpoint after each workspace's insight generation"

patterns-established:
  - "Insight status management: approve triggers executeAction, result stored as executionResult JSON"
  - "Recommendation-only actions: return audit trail without modifying external state"

requirements-completed: [INSIGHT-03, INSIGHT-04, INSIGHT-06]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 27 Plan 02: Insights API, Action Executors & Weekly Digest Summary

**Insights CRUD API with 4 action executors (pause/ICP/copy/signal), before/after audit trail, and weekly digest notifications via Slack + email**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T12:28:35Z
- **Completed:** 2026-03-10T12:32:37Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Full Insights API: GET with workspace/status/category filters, POST for manual refresh, PATCH for approve/dismiss/snooze
- Action executor handles all 4 types with before/after audit trail stored as executionResult JSON
- Weekly digest notification via Slack + email sent after insight generation in cron endpoint
- Expired snoozed insights auto-reactivate when queried with status=active

## Task Commits

Each task was committed atomically:

1. **Task 1: API routes for insights list, status update, and manual refresh** - `cd13af3` (feat)
2. **Task 2: Action executors with audit trail** - `4b965ff` (feat)
3. **Task 3: Weekly digest notification** - `5cff45a` (feat)

## Files Created/Modified
- `src/app/api/insights/route.ts` - GET list with filters + POST manual refresh
- `src/app/api/insights/[id]/route.ts` - PATCH approve/dismiss/snooze with action execution
- `src/lib/insights/actions.ts` - executeAction for all 4 action types with audit trail
- `src/lib/notifications.ts` - notifyWeeklyDigest function added (Slack + email with audited())
- `src/app/api/cron/generate-insights/route.ts` - Updated to send weekly digest after insight generation

## Decisions Made
- All 4 action types execute immediately on approve (admin confirms in UI before calling PATCH endpoint)
- pause_campaign updates local campaign status only -- EmailBison API does not support remote pause
- ICP threshold and signal targeting are recommendation-only actions (no auto-modify of text prompts)
- copy_review_flag stored as CachedMetrics entry for visibility across features
- Weekly digest notification sent from cron endpoint after each workspace's generation completes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed verifySlackChannel intent type for weekly digest**
- **Found during:** Task 3 (TypeScript compilation)
- **Issue:** `verifySlackChannel` requires `"client" | "admin"` as intent, not a workspace slug string
- **Fix:** Added `slackIntent` variable that resolves to "client" or "admin" based on channel source
- **Files modified:** src/lib/notifications.ts
- **Verification:** TypeScript compilation passes with zero errors
- **Committed in:** 5cff45a (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type fix for notification guard compatibility. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Uses existing Slack/email/cron infrastructure.

## Next Phase Readiness
- Insights API complete, ready for Plan 03 (Insights tab UI on analytics page)
- All endpoints return parsed JSON fields (evidence, actionParams, executionResult)
- Weekly digest automatically included in cron execution flow

---
*Phase: 27-ai-insights-action-queue*
*Completed: 2026-03-10*
