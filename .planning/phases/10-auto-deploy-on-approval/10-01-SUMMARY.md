---
phase: 10-auto-deploy-on-approval
plan: "01"
subsystem: api
tags: [prisma, emailbison, linkedin, campaigns, deploy, queue]

requires:
  - phase: 08-campaign-agent
    provides: Campaign model, emailSequence/linkedinSequence JSON columns, getCampaign/operations.ts
  - phase: 09-client-portal
    provides: Campaign approval state machine, targetListId linkage, campaign.status=deployed
  - phase: 11-linkedin-voyager-api
    provides: enqueueAction, assignSenderForPerson, LinkedInAction queue

provides:
  - CampaignDeploy Prisma model (status, per-channel tracking, counts, errors, retry support)
  - executeDeploy — orchestrates email + linkedin deploy fire-and-forget
  - retryDeployChannel — retry a single failed channel on an existing deploy
  - getDeployHistory — list all deploys for a campaign
  - EmailBisonClient.createSequenceStep — POST /campaigns/{id}/sequence-steps

affects:
  - 10-02 (deploy API route uses executeDeploy)
  - 10-03 (webhook LinkedIn step trigger builds on deploy's channel logic)
  - 10-04 (connection accept detection queries CampaignDeploy records)
  - 10-05 (deploy notifications read CampaignDeploy status)

tech-stack:
  added: []
  patterns:
    - withRetry helper (3x, delays 1s/5s/15s) wraps all EmailBison API calls
    - Fire-and-forget deploy pattern: API returns 202, executeDeploy runs async
    - Outsignal-side dedup via WebhookEvent.eventType=EMAIL_SENT check before pushing leads
    - LinkedIn stagger: lead i fires at i*15min to avoid burst
    - Per-channel error isolation: email failure does not abort linkedin

key-files:
  created:
    - src/lib/campaigns/deploy.ts
  modified:
    - prisma/schema.prisma
    - src/lib/emailbison/client.ts
    - src/lib/emailbison/types.ts

key-decisions:
  - "deployEmailChannel stores emailBisonCampaignId on both CampaignDeploy and Campaign — enables webhook matching in Plan 03"
  - "LinkedIn-only first step enqueued at deploy time; email_sent-triggered steps deferred to webhook handler (Plan 03)"
  - "Outsignal-side dedup: skip leads with existing WebhookEvent EMAIL_SENT for the workspace — EmailBison's own dedup is fallback"
  - "Lead push is serial with 100ms throttle — prevents API rate-limiting on large lists"
  - "assignSenderForPerson called with mode=email_linkedin for mixed campaigns, linkedin_only otherwise"
  - "finalizeDeployStatus computes complete/partial_failure/failed from per-channel outcomes atomically after both channels run"

patterns-established:
  - "Deploy operations split into focused per-channel functions (deployEmailChannel, deployLinkedInChannel) called by orchestrator"
  - "withRetry wraps all external API calls; internal DB calls are not retried"
  - "Channel-level try/catch writes per-channel error fields; top-level catch handles unexpected failures"

requirements-completed: [DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06, DEPLOY-07]

duration: 8min
completed: 2026-03-03
---

# Phase 10 Plan 01: CampaignDeploy Model and Deploy Operations Layer Summary

**CampaignDeploy Prisma model + deploy operations module (executeDeploy/retryDeployChannel) that pushes email sequences and leads to EmailBison and enqueues LinkedIn actions with retry, dedup, and per-channel error isolation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-03T08:45:22Z
- **Completed:** 2026-03-03T08:53:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- CampaignDeploy model synced to Neon PostgreSQL with full status/error/retry tracking schema
- EmailBisonClient extended with `createSequenceStep` POST method following existing `request()` pattern
- Deploy operations layer handles email-only, linkedin-only, and dual-channel campaigns with exponential backoff retry on all EB API calls
- Outsignal-side lead dedup prevents re-pushing contacts with existing EMAIL_SENT events
- LinkedIn first-step enqueue with 15-minute per-lead stagger; email_sent-triggered steps correctly deferred to Plan 03 webhook

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CampaignDeploy model + extend EmailBisonClient** - `61942db` (feat)
2. **Task 2: Create deploy operations module** - `1304115` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `prisma/schema.prisma` - CampaignDeploy model added, Campaign.deploys relation added
- `src/lib/emailbison/types.ts` - CreateSequenceStepParams interface added
- `src/lib/emailbison/client.ts` - createSequenceStep method added, CreateSequenceStepParams imported
- `src/lib/campaigns/deploy.ts` - New file: withRetry, deployEmailChannel, deployLinkedInChannel, finalizeDeployStatus, executeDeploy, retryDeployChannel, getDeployHistory

## Decisions Made

- `deployEmailChannel` stores `emailBisonCampaignId` on both `CampaignDeploy` and `Campaign` records simultaneously — enables the webhook in Plan 03 to match incoming EMAIL_SENT events to the right campaign
- For email+linkedin campaigns, only steps with `triggerEvent === 'delay_after_previous'` are enqueued at deploy time. Steps triggered by `email_sent` events are handled by the webhook handler in Plan 03, keeping the deploy logic clean
- Lead push is serial (not parallel) with 100ms delay between — defensive choice to avoid hitting EmailBison rate limits on large lists; acceptable latency for background job
- `assignSenderForPerson` called with `mode: 'email_linkedin'` for mixed campaigns (not yet matching by email sender — that matching happens at webhook time in Plan 03)
- `finalizeDeployStatus` reads channel statuses after both channels run and derives `complete / partial_failure / failed` from the combination

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — `npx prisma db push` succeeded immediately, `npx tsc --noEmit` passed clean on first attempt for both tasks.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 02 (deploy API route) can import `executeDeploy` from `@/lib/campaigns/deploy` and call it fire-and-forget after returning 202
- Plan 02 should create the `CampaignDeploy` record (status: pending, channels JSON) before calling `executeDeploy`
- Plan 03 (webhook LinkedIn trigger) can query `CampaignDeploy.emailBisonCampaignId` to match EMAIL_SENT webhooks to campaigns
- `getDeployHistory` is ready for the campaign detail page deploy history table (Plan 02 or Plan 05)

## Self-Check: PASSED

- `src/lib/campaigns/deploy.ts` — FOUND
- `src/lib/emailbison/types.ts` — FOUND
- `.planning/phases/10-auto-deploy-on-approval/10-01-SUMMARY.md` — FOUND
- Commit `61942db` — FOUND
- Commit `1304115` — FOUND

---
*Phase: 10-auto-deploy-on-approval*
*Completed: 2026-03-03*
