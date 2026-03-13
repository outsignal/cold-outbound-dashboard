---
phase: quick
plan: 4
subsystem: ui
tags: [prisma, next.js, dashboard, costs, gbp]

requires: []
provides:
  - PlatformCost Prisma model with @@unique([service, client])
  - GET/PUT API at /api/platform-costs with auto-seeding
  - Platform Costs admin dashboard page with inline editing
  - Sidebar link under System group
affects: []

tech-stack:
  added: []
  patterns:
    - "Inline editable table cells with optimistic updates and saved indicator"
    - "Auto-seed on first GET when table is empty"

key-files:
  created:
    - src/app/api/platform-costs/route.ts
    - src/app/(admin)/platform-costs/page.tsx
  modified:
    - prisma/schema.prisma
    - src/components/layout/sidebar.tsx

key-decisions:
  - "Auto-seed ~25 entries on first GET rather than migration script"
  - "@@unique([service, client]) allows multiple CheapInboxes rows per client"

patterns-established:
  - "Inline edit pattern: click cell to edit, blur/Enter to save, green checkmark fade"

requirements-completed: [QUICK-4]

duration: 5min
completed: 2026-03-13
---

# Quick Task 4: Platform Costs Dashboard Summary

**GBP platform cost tracker with ~25 seeded services, inline editing, category grouping, and summary cards showing total monthly burn**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-13T12:11:16Z
- **Completed:** 2026-03-13T12:15:52Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- PlatformCost model with @@unique([service, client]) supporting multiple rows per service (e.g. CheapInboxes per client)
- API route with GET (auto-seeds ~25 entries, returns aggregations) and PUT (inline update monthlyCost/notes)
- Dashboard page with 4 summary cards (Total Monthly Burn, Shared Costs, Client-Specific, Services count)
- Services table grouped by category with colored dots, subtotals, and inline editing
- Sidebar link added under System group with Wallet icon

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PlatformCost model and create API route with seed data** - `a33f8b0` (feat)
2. **Task 2: Build Platform Costs dashboard page and add sidebar link** - `96880f1` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added PlatformCost model
- `src/app/api/platform-costs/route.ts` - GET/PUT endpoints with auto-seeding
- `src/app/(admin)/platform-costs/page.tsx` - Dashboard page with inline editing
- `src/components/layout/sidebar.tsx` - Added Wallet icon import and Platform Costs nav item

## Decisions Made
- Auto-seed on first GET when table is empty (no separate seed script needed)
- @@unique([service, client]) allows same service name with different clients (e.g. 6 CheapInboxes rows)
- Category order: tools, api, email, infrastructure (alphabetical within each)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Page is live at /platform-costs after deployment
- Costs can be updated inline by admin
- Future: could add API-pulled usage data for pay-per-use services (Anthropic, etc.)

---
*Quick Task: 4*
*Completed: 2026-03-13*
