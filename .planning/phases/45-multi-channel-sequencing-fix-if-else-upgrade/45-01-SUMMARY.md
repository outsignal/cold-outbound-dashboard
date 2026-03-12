---
phase: 45-multi-channel-sequencing-fix-if-else-upgrade
plan: 01
subsystem: api
tags: [linkedin, sequencing, webhook, prisma, typescript]

# Dependency graph
requires:
  - phase: 42-trigger-dev-cron-migration
    provides: webhook handler that triggers LinkedIn sequencing on EMAIL_SENT
  - phase: 39-trigger-dev-webhook-plumbing
    provides: linkedin queue and sequencing engine foundation
provides:
  - Fixed triggerStepRef derivation in createSequenceRulesForCampaign (email_sent rules now match webhook queries)
  - Cascade delete of CampaignSequenceRule on campaign deletion
  - Bounce event cancels all pending LinkedIn actions for the person in the workspace
  - Unsubscribe event cancels all pending LinkedIn actions for the person in the workspace
  - Connect dedup prevents duplicate connection requests for persons already pending/connected
affects:
  - linkedin-sequencing
  - emailbison-webhook
  - campaign-operations

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Derive triggerStepRef from step.position for email_sent rules at rule-creation time
    - Cascade cleanup pattern before prisma.delete (deleteMany related records first)
    - Person lookup + cancelActionsForPerson guard on BOUNCE and UNSUBSCRIBED webhook events
    - Connect dedup via linkedInConnection.findFirst with workspace-scoped sender filter

key-files:
  created: []
  modified:
    - src/lib/linkedin/sequencing.ts
    - src/lib/campaigns/operations.ts
    - src/app/api/webhooks/emailbison/route.ts

key-decisions:
  - "triggerStepRef derivation uses email_${step.position} for email_sent rules AND for steps with no explicit triggerEvent at positions > 1 (position 1 defaults to delay_after_previous)"
  - "Cascade delete reuses current query by expanding select to include name and workspaceSlug — avoids a second DB round trip"
  - "Connect dedup scoped per workspace via sender relation filter — a person can still be targeted by different workspaces"

patterns-established:
  - "Always derive triggerStepRef at rule-creation time so webhook's triggerStepRef filter can match"
  - "Cancel LinkedIn actions on any event that marks a person as non-contactable (bounce, unsub)"

requirements-completed: [SEQ-BUG-01, SEQ-BUG-02, SEQ-BUG-03, SEQ-BUG-04]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 45 Plan 01: Multi-Channel Sequencing Bug Fixes Summary

**Four silent sequencing engine bugs fixed: triggerStepRef null mismatch, orphaned sequence rules on campaign delete, bounce/unsub not cancelling LinkedIn actions, and duplicate connect requests**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-12T21:42:11Z
- **Completed:** 2026-03-12T21:43:31Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Fixed triggerStepRef derivation so all email-triggered LinkedIn actions correctly match their webhook queries
- Added cascade delete of CampaignSequenceRule records when a campaign is deleted, preventing orphaned rule accumulation
- BOUNCE and UNSUBSCRIBED webhook events now cancel all pending LinkedIn actions for the person in the workspace
- Connect actions are skipped if the person already has a pending or connected LinkedIn connection in the workspace

## Task Commits

1. **Task 1: Fix triggerStepRef derivation + cascade delete** - `75a6cb6` (fix)
2. **Task 2: Bounce/unsub cancellation + connect dedup in webhook** - `ce706d5` (fix)

## Files Created/Modified

- `src/lib/linkedin/sequencing.ts` - triggerStepRef now derived as `email_${step.position}` for email_sent rules
- `src/lib/campaigns/operations.ts` - deleteCampaign cleans up CampaignSequenceRule records before deleting; select expanded to include name + workspaceSlug
- `src/app/api/webhooks/emailbison/route.ts` - cancelActionsForPerson called on BOUNCE/UNSUBSCRIBED; connect dedup added in EMAIL_SENT LinkedIn section

## Decisions Made

- `triggerStepRef` is derived for two cases: explicit `triggerEvent === "email_sent"` AND steps with no triggerEvent at positions > 1 (which default to email_sent at rule-creation time). This handles both explicit and implicit email_sent rules.
- Cascade delete reuses the already-fetched `current` record by expanding its `select` — avoids a second DB round trip.
- Connect dedup uses a workspace-scoped filter via `sender: { workspaceSlug }` — cross-workspace campaigns remain independent.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 4 sequencing bugs resolved, no schema migration required
- Phase 45 Plan 02 (if/else branching conditions and engagement-based routing) can proceed
- TypeScript compiles cleanly after all changes

---
*Phase: 45-multi-channel-sequencing-fix-if-else-upgrade*
*Completed: 2026-03-12*
