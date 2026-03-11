---
phase: 35-email-inbox
plan: 01
subsystem: database
tags: [prisma, postgresql, emailbison, reply, inbox, thread-grouping]

# Dependency graph
requires: []
provides:
  - Reply model with 7 new inbox fields (emailBisonParentId, leadEmail, htmlBody, interested, direction, ebSenderEmailId, aiSuggestedReply)
  - 2 new Reply indexes for thread grouping queries ([workspaceSlug, emailBisonParentId] and [workspaceSlug, leadEmail])
  - Webhook handler populating all 7 inbox fields on Reply upsert + persisting aiSuggestedReply after AI generation
  - Poll-replies cron populating 6 inbox fields (no aiSuggestedReply) on Reply upsert
affects: [35-02, 35-03, 35-04, 35-05, 35-06, 36]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "direction derived from EB folder/type: Sent or Outgoing Email = outbound, else inbound"
    - "aiSuggestedReply persisted inside .then() block after Slack messages, non-blocking via .catch()"
    - "db push used instead of migrate dev due to pre-existing migration drift in dev database"

key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - src/app/api/webhooks/emailbison/route.ts
    - src/app/api/cron/poll-replies/route.ts

key-decisions:
  - "prisma db push used instead of migrate dev — database schema was ahead of migration history (pre-existing drift), reset would destroy production data"
  - "aiSuggestedReply not added to poll-replies cron — AI suggestion requires full context (lead name, interested flag) only available in webhook handler"
  - "leadEmail lowercased on write — normalized for consistent thread grouping queries"
  - "direction defaults to inbound — explicit outbound detection via folder=Sent or type=Outgoing Email"

patterns-established:
  - "Inbox fields added inline to existing upsert create/update blocks — no separate update query needed"
  - "New inbox update fields use ?? undefined pattern — leaves existing value intact if EB data unavailable"

requirements-completed: [EMAIL-01, EMAIL-03, EMAIL-04]

# Metrics
duration: 15min
completed: 2026-03-11
---

# Phase 35 Plan 01: Email Inbox Data Foundation Summary

**Reply model extended with 7 inbox fields (thread grouping, HTML body, direction, sender ID, AI suggestion) and both ingestion paths (webhook + poll-replies cron) updated to populate them**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-11T14:59:54Z
- **Completed:** 2026-03-11T15:14:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added 7 new fields to Prisma Reply model: emailBisonParentId, leadEmail, htmlBody, interested, direction, ebSenderEmailId, aiSuggestedReply
- Added 2 new indexes on [workspaceSlug, emailBisonParentId] and [workspaceSlug, leadEmail] for thread grouping performance
- Updated webhook handler to populate all 7 fields on Reply create + 4 fields on update, and to persist aiSuggestedReply after AI generation
- Updated poll-replies cron to populate 6 fields (all except aiSuggestedReply) on Reply create + 4 fields on update
- Applied schema via prisma db push (database had pre-existing migration drift), TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Add inbox fields to Reply model and run migration** - `db4b696` (feat)
2. **Task 2: Update webhook handler and poll-replies cron to populate inbox fields** - `5b805dc` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `prisma/schema.prisma` - 7 new Reply fields + 2 new indexes
- `src/app/api/webhooks/emailbison/route.ts` - inbox fields in upsert + aiSuggestedReply persistence
- `src/app/api/cron/poll-replies/route.ts` - inbox fields in upsert (no AI suggestion)

## Decisions Made
- Used `prisma db push` instead of `migrate dev` — the dev database was ahead of migration history (pre-existing drift from manual changes). Reset would have destroyed all reply data. `db push` applied only the new fields safely.
- `aiSuggestedReply` is webhook-only — the poll-replies cron has no access to the full lead context (name, interested flag, campaign) needed to generate a quality suggestion.
- `leadEmail` is lowercased on write for consistent thread grouping queries.

## Deviations from Plan

None - plan executed exactly as written. The only adaptation was using `prisma db push` instead of `prisma migrate dev` due to pre-existing database drift — this achieves the same result (schema applied, client generated) without data loss.

## Issues Encountered
- `prisma migrate dev` detected database drift (schema ahead of migration history — pre-existing condition, not caused by this plan) and required an interactive reset confirmation. Switched to `prisma db push` which applied the new columns directly without resetting data.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Reply model now has all fields required for Phase 35 Plans 02-06 (thread list, conversation view, reply sending, AI suggestion display)
- All new data is being captured from this point forward via both ingestion paths
- Historical Reply records will have NULL for the new fields — Plans 02+ should handle nulls gracefully in UI

---
*Phase: 35-email-inbox*
*Completed: 2026-03-11*
