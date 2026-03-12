---
phase: 43-decommission-observability-validation
plan: "03"
subsystem: ui
tags: [trigger.dev, next.js, admin-dashboard, observability, background-tasks]

# Dependency graph
requires:
  - phase: 43-02
    provides: clean codebase after fire-and-forget removal and dead cron routes deletion
provides:
  - Background Tasks admin page at /background-tasks surfacing Trigger.dev run status
  - API proxy at /api/background-tasks for Trigger.dev REST API
  - Sidebar navigation link to Background Tasks under System group
affects:
  - 43-04 (final phase 43 validation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Trigger.dev REST API proxied through Next.js API route (no SDK, plain fetch + Bearer token)
    - Period-parameterized task run queries with workspace tag filtering
    - Inline error expansion rows for failed task runs (not modal/click-behind)

key-files:
  created:
    - src/app/api/background-tasks/route.ts
    - src/app/(admin)/background-tasks/page.tsx
    - src/app/(admin)/background-tasks/loading.tsx
  modified:
    - src/components/layout/sidebar.tsx

key-decisions:
  - "Trigger.dev REST API proxied via Next.js route using plain fetch with Bearer token — no SDK import needed, avoids build-time complexity"
  - "Workspace filter uses tag extraction from live run data — tags are set at trigger time, so filter options are dynamic (not hardcoded)"
  - "Failed task errors displayed as inline red row immediately below the task row — per locked plan decision, not hidden behind a click"
  - "Auto-refresh uses 10s interval when running > 0, 30s otherwise — trades polling cost for faster EXECUTING state visibility"

patterns-established:
  - "Trigger.dev proxy pattern: GET /api/background-tasks?period=1d&workspace=slug"
  - "Inline error row pattern: <TableRow key={id-error}> with colSpan=6 red-tinted cell for FAILED/CRASHED/SYSTEM_FAILURE statuses"

requirements-completed: [DECOMM-04]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 43 Plan 03: Background Tasks Summary

**Trigger.dev task run observability dashboard with inline failure errors, workspace tag filter, period selector, and auto-refresh — no Trigger.dev login required**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-12T21:31:28Z
- **Completed:** 2026-03-12T21:34:57Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- GET /api/background-tasks proxies Trigger.dev REST API (runs + schedules), computes summary, protected by requireAdminAuth
- Admin page at /background-tasks with period filter (1d/7d/30d), workspace tag filter, 4 summary metric cards, task runs table, active schedules table
- Failed/Crashed/System Failure tasks show error message inline in a red-tinted row directly below — immediately visible without interaction
- Auto-refresh every 30s (10s when tasks are EXECUTING/REATTEMPTING)
- Loading skeleton for initial page load
- "Background Tasks" added to System nav group in sidebar after "Agent Runs" with Cpu icon

## Task Commits

1. **Task 1: Background Tasks API route** - `1434288` (feat)
2. **Task 2: Background Tasks admin page + sidebar link** - `1421c56` (feat)

## Files Created/Modified

- `src/app/api/background-tasks/route.ts` - GET handler proxying Trigger.dev /runs and /schedules, computes summary, returns JSON
- `src/app/(admin)/background-tasks/page.tsx` - "use client" admin page with filters, MetricCards, runs table with inline errors, schedules table
- `src/app/(admin)/background-tasks/loading.tsx` - Shimmer loading skeleton matching page layout
- `src/components/layout/sidebar.tsx` - Added Cpu import and Background Tasks nav item in system group

## Decisions Made

- Proxied Trigger.dev REST API via Next.js API route using plain fetch with `Authorization: Bearer ${TRIGGER_SECRET_KEY}` — no SDK overhead, simpler build.
- Workspace tag filter options derived dynamically from live run data — tags that don't start with `run_` are treated as workspace slugs. Avoids hardcoding workspace list.
- Inline error rows: when status is FAILED/CRASHED/SYSTEM_FAILURE and `run.error.message` exists, a second `<TableRow>` with colSpan=6 red-tinted cell renders immediately below. Fulfills the locked "no click-behind" requirement.
- `formatDuration` handles ms/seconds/minutes gracefully; `formatRelativeTime` matches the existing `timeAgo` pattern in notification-health.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. `TRIGGER_SECRET_KEY` already set in Vercel env vars from Phase 38.

## Next Phase Readiness

- Background Tasks observability is live — admin can monitor Trigger.dev runs without logging into Trigger.dev
- Phase 43 requirement DECOMM-04 fulfilled
- Ready for Phase 43-04 (final validation / phase close-out)

---
*Phase: 43-decommission-observability-validation*
*Completed: 2026-03-12*

## Self-Check: PASSED

- FOUND: src/app/api/background-tasks/route.ts
- FOUND: src/app/(admin)/background-tasks/page.tsx
- FOUND: src/app/(admin)/background-tasks/loading.tsx
- FOUND: .planning/phases/43-decommission-observability-validation/43-03-SUMMARY.md
- FOUND commit 1434288: feat(43-03): add Background Tasks API route proxying Trigger.dev REST API
- FOUND commit 1421c56: feat(43-03): add Background Tasks admin page and sidebar navigation
