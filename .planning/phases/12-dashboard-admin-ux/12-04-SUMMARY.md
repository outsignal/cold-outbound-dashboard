---
phase: 12-dashboard-admin-ux
plan: "04"
subsystem: ui
tags: [react, next.js, prisma, nuqs, tailwind, table, monitoring]

requires:
  - phase: 12-01
    provides: Dashboard foundation and shared layout/header components
  - phase: 8-01
    provides: AgentRun model in Prisma schema

provides:
  - GET /api/agent-runs endpoint with agent/status/workspace filters and pagination
  - AgentRunTable component — compact Datadog-style table with expandable accordion rows
  - /agent-runs admin page with URL-persisted filters and auto-refresh for live runs
  - Agent Runs entry added to sidebar nav

affects: [12-05, 12-06, 12-07]

tech-stack:
  added: []
  patterns:
    - Compact table density via py-1.5 px-2 cell padding (vs default py-4)
    - Inline accordion expansion — single expanded row, click to toggle, no navigation
    - URL-persisted filter state via nuqs useQueryState
    - Auto-refresh with setInterval only when live data (status=running) present
    - Safe JSON parsing helper (safeParseJson) for nullable JSON string columns

key-files:
  created:
    - src/app/api/agent-runs/route.ts
    - src/components/operations/agent-run-table.tsx
    - src/app/(admin)/agent-runs/page.tsx
  modified:
    - src/components/layout/sidebar.tsx

key-decisions:
  - "AgentRunTable uses single expandedId state — only one row open at a time, clicking active closes it"
  - "Auto-refresh only activates when data includes a run with status=running — no unnecessary polling"
  - "Workspace filter dropdown populated from first-page fetch, not a separate API call"
  - "StepsList gracefully handles both array-of-objects and raw JSON string formats from steps column"

patterns-established:
  - "Compact operational table: text-xs, py-1.5 px-2 on cells, border rounded container"
  - "Inline detail accordion: TableRow with colSpan follows clicked row, no navigation"
  - "Agent badge colors: leads=blue, writer=purple, campaign=green, research=amber"
  - "Status badge: running=yellow+pulse animation, complete=green, failed=red"

requirements-completed: [DASH-07]

duration: 4min
completed: "2026-03-02"
---

# Phase 12 Plan 04: Agent Run Monitoring Summary

**Datadog-style compact agent run monitoring page at /agent-runs with expandable inline accordions showing full run details (input/output/steps/error) and auto-refresh for live runs**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-02T20:31:58Z
- **Completed:** 2026-03-02T20:35:22Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Paginated, filtered GET /api/agent-runs endpoint with dynamic where clause built from agent/status/workspace/page/limit query params
- AgentRunTable with compact Datadog-style density (text-xs, py-1.5 cells), expandable accordion rows, color-coded badges, pulse animation for running status, duration formatting (ms/s/m)
- Expanded detail sections show pretty-printed input/output JSON, numbered steps list with tool names and truncated args, red-tinted error block
- /agent-runs page with URL-persisted filters via nuqs, pagination, and setInterval auto-refresh (30s) that only activates when running jobs are present
- Agent Runs added to sidebar navigation with Activity icon

## Task Commits

Each task was committed atomically:

1. **Task 1: Agent runs API endpoint** - `627fa7d` (feat)
2. **Task 2: Agent run table component + monitoring page** - `8c35225` (feat)

**Plan metadata:** (see final commit)

## Files Created/Modified

- `src/app/api/agent-runs/route.ts` — GET endpoint with agent/status/workspace filters, pagination (max 100/page), returns {runs, total, page, totalPages}
- `src/components/operations/agent-run-table.tsx` — Compact table with expandable accordion rows; handles input/output/steps/error display with safe JSON parsing
- `src/app/(admin)/agent-runs/page.tsx` — Monitoring page with URL-persisted filters (nuqs), workspace discovery from first fetch, auto-refresh when running jobs present
- `src/components/layout/sidebar.tsx` — Added Agent Runs nav item with Activity (lucide) icon

## Decisions Made

- Single expandedId state in AgentRunTable — only one row can be expanded at a time; clicking an expanded row closes it (toggle pattern)
- Auto-refresh via setInterval only activates when data contains a run with status="running" — avoids unnecessary polling on idle views
- Workspace filter options populated from first-page API fetch (no separate workspace list endpoint needed)
- StepsList handles both structured array-of-objects and raw JSON string from the steps column

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Agent Runs to sidebar navigation**
- **Found during:** Task 2 (agent-runs page creation)
- **Issue:** Plan did not specify adding the page to sidebar nav, but without it the page is unreachable from the UI
- **Fix:** Added `{ href: "/agent-runs", label: "Agent Runs", icon: Activity }` to mainNav in sidebar.tsx
- **Files modified:** src/components/layout/sidebar.tsx
- **Verification:** TypeScript passes, no unused import warnings
- **Committed in:** 8c35225 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (missing critical nav link)
**Impact on plan:** Necessary for UI reachability. No scope creep.

## Issues Encountered

- Single-file `npx tsc --noEmit src/app/api/agent-runs/route.ts` showed pre-existing Next.js node_modules type errors — confirmed these are pre-existing by running full project check which passes clean for all our files. Out of scope per deviation rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- /agent-runs page is live and functional; will show real data once AgentRun rows exist in DB
- Operations component directory established at src/components/operations/ — ready for LinkedIn queue and webhook log views (plans 12-05, 12-06)
- Compact table density pattern established and documented for reuse in subsequent operational views

---
*Phase: 12-dashboard-admin-ux*
*Completed: 2026-03-02*
