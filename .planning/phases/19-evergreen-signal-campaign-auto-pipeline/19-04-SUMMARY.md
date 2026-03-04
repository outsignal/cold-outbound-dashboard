---
phase: 19-evergreen-signal-campaign-auto-pipeline
plan: "04"
subsystem: ui
tags: [next.js, prisma, signal-campaigns, admin-dashboard, railway, cron-worker]

# Dependency graph
requires:
  - phase: 19-01
    provides: Campaign model signal fields (type, icpCriteria, signalTypes, dailyLeadCap, icpScoreThreshold, lastSignalProcessedAt), CampaignDetail type, updateCampaignStatus signal state machine
  - phase: 19-03
    provides: /api/pipeline/signal-campaigns/process endpoint the worker calls
provides:
  - Worker-signals/index.ts triggers /api/pipeline/signal-campaigns/process after each runCycle() via HTTP POST
  - PATCH /api/campaigns/[id]/signal-status endpoint for pause/resume/archive of signal campaigns from dashboard
  - Type badge column (Signal/Static) in admin campaigns list page
  - Signal Stats card on campaign detail page (signal types, daily cap, ICP threshold, last processed, leads added)
  - SignalStatusButton client component for pause/resume of active/paused signal campaigns
  - Archived status color in both STATUS_COLORS maps
affects: [19-05, 19-06, worker-signals deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Best-effort HTTP trigger pattern — worker calls main app after completing its primary job, logs errors but does not crash
    - Signal-specific UI conditional rendering — signal cards/buttons only render when campaign.type === "signal"
    - Client component for mutation with router.refresh() — no API library, plain fetch + useRouter

key-files:
  created:
    - worker-signals/src/index.ts (modified — added triggerSignalPipeline function)
    - src/app/api/campaigns/[id]/signal-status/route.ts
    - src/app/(admin)/campaigns/[id]/SignalStatusButton.tsx
  modified:
    - src/app/(admin)/campaigns/page.tsx
    - src/app/(admin)/campaigns/[id]/page.tsx

key-decisions:
  - "19-04 worker-trigger: triggerSignalPipeline is best-effort — AbortSignal.timeout(55_000) + try/catch logs errors without crashing the worker"
  - "19-04 signal-status-api: No auth guard — consistent with all other admin API routes (15-04 decision)"
  - "19-04 admin-ui: Deploy History section hidden for signal campaigns (not applicable to signal flow); DeployButton only renders for static campaigns"
  - "19-04 admin-ui: signalLeadCount queries prisma.signalCampaignLead with outcome=added — only counts successfully added leads"

patterns-established:
  - "Best-effort HTTP trigger: worker completes its job, then fires HTTP trigger; failures are logged not propagated"
  - "Signal vs static conditional UI: campaign.type === 'signal' gates all signal-specific UI; static campaigns never see signal cards"

requirements-completed: [PIPE-08, PIPE-09]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 19 Plan 04: Worker Pipeline Trigger + Signal Campaign Dashboard Controls Summary

**Railway signal worker now triggers /api/pipeline/signal-campaigns/process after each poll cycle; admin dashboard shows Signal/Static type badges, signal stats card, and pause/resume button for signal campaigns**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T22:25:23Z
- **Completed:** 2026-03-04T22:28:02Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Signal worker (Railway cron) now fires best-effort HTTP POST to main app after each runCycle() completes, closing the loop between Phase 18 signal collection and Phase 19 pipeline processing
- Admin campaigns list page shows Type column with brand-colored Signal badge (F0FF7A/20) or zinc Static badge, plus daily cap sub-text for signal campaigns
- Campaign detail page shows Signal Stats card with signal types, daily cap, ICP threshold, last processed date, and live leads-added count from SignalCampaignLead table
- Pause/Resume button (SignalStatusButton) appears in detail page header for active/paused signal campaigns; static campaigns show DeployButton unchanged

## Task Commits

1. **Task 1: Add pipeline trigger to signal worker and create pause/resume API** - `563d2a3` (feat)
2. **Task 2: Add signal campaign visibility to admin campaigns UI** - `cf67adc` (feat)

**Plan metadata:** (docs commit following)

## Files Created/Modified

- `worker-signals/src/index.ts` - Added `triggerSignalPipeline()` function and call after runCycle(); 55s timeout, best-effort (errors logged, worker not crashed)
- `src/app/api/campaigns/[id]/signal-status/route.ts` - PATCH endpoint; validates action (pause/resume/archive), verifies signal campaign type, calls updateCampaignStatus
- `src/app/(admin)/campaigns/[id]/SignalStatusButton.tsx` - Client component; calls PATCH signal-status, router.refresh() on success, loading state
- `src/app/(admin)/campaigns/page.tsx` - Added archived to STATUS_COLORS, Type column with Signal/Static badges, dailyLeadCap sub-text, colspan 6->7
- `src/app/(admin)/campaigns/[id]/page.tsx` - Added archived to STATUS_COLORS, formatDate helper, signalLeadCount query, SignalStatusButton in header, Signal Stats card, Deploy History hidden for signal campaigns

## Decisions Made

- triggerSignalPipeline uses `AbortSignal.timeout(55_000)` (55s, just under Vercel's 60s limit) wrapped in try/catch — signal events are already written, pipeline trigger is best-effort
- No auth guard on /api/campaigns/[id]/signal-status — consistent with all other admin routes (established 15-04)
- Deploy History section is hidden (not rendered) for signal campaigns — they use the signal pipeline flow, not the EmailBison deploy flow
- signalLeadCount only counts `outcome: "added"` records to show successfully enrolled leads, not attempts or rejections

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Two environment variables must be set on the Railway worker-signals service before the pipeline trigger will fire:

- `MAIN_APP_URL` — e.g. `https://admin.outsignal.ai`
- `PIPELINE_INTERNAL_SECRET` — shared secret matching the main app's PIPELINE_INTERNAL_SECRET env var

If these are not set, the worker logs a skip message and continues normally (no crash).

## Next Phase Readiness

- Worker-to-pipeline connection is complete — deploying updated worker-signals to Railway will activate end-to-end signal campaign processing
- Admin can now see, pause, and resume signal campaigns from the dashboard without using the chat CLI
- PIPE-08 (pause/resume from dashboard) and PIPE-09 (static campaigns unaffected) are satisfied
- Phase 19 plans 05 and 06 can proceed

---
*Phase: 19-evergreen-signal-campaign-auto-pipeline*
*Completed: 2026-03-04*
