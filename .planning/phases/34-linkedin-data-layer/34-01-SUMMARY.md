---
phase: 34-linkedin-data-layer
plan: 01
subsystem: database
tags: [prisma, postgresql, linkedin, voyager, sync, portal]

# Dependency graph
requires:
  - phase: 33-api-spike-client-extensions
    provides: VoyagerConversation/VoyagerMessage shapes, worker endpoint contracts (GET /sessions/{senderId}/conversations)
provides:
  - LinkedInConversation, LinkedInMessage, LinkedInSyncStatus Prisma models in PostgreSQL
  - syncLinkedInConversations() function with Person matching by LinkedIn URL, fire-and-forget safe
  - POST /api/portal/inbox/linkedin/sync returning 202 + existing conversations, triggering async worker sync
affects: [35-email-inbox-portal, 36-linkedin-inbox-portal, 37-inbox-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget async sync: void Promise.allSettled() in route handler, 202 returned before any Voyager calls"
    - "5-min per-sender cooldown via LinkedInSyncStatus.lastSyncedAt"
    - "normalizeLinkedinUrl: /in/username lowercase extraction before DB Person matching"
    - "personId immutable after first match — initial URL match is authoritative, not re-evaluated on re-sync"

key-files:
  created:
    - src/lib/linkedin/sync.ts
    - src/app/api/portal/inbox/linkedin/sync/route.ts
  modified:
    - prisma/schema.prisma
    - src/lib/linkedin/types.ts

key-decisions:
  - "personId not updated on re-sync — initial Person match is authoritative (prevents race conditions and preserves match accuracy)"
  - "Sender filter uses status='active' only, not sessionStatus — expired sessions still show previously-synced conversations"
  - "normalizeLinkedinUrl lowercases /in/username before Person.linkedinUrl contains query — prevents format mismatch"
  - "LinkedInSyncStatus is a separate model (not on Sender) — cleaner separation, consistent with existing pattern"

patterns-established:
  - "LinkedIn inbox DB reads: always query LinkedInConversation by workspaceSlug, not senderId — workspace-scoped for multi-sender support"
  - "Sync API response shape: { conversations, lastSyncedAt, syncing } — standard for Phase 36 UI polling"

requirements-completed: [LI-01, LI-02, LI-03, LI-04]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 34 Plan 01: LinkedIn Data Layer Summary

**Three Prisma models (LinkedInConversation, LinkedInMessage, LinkedInSyncStatus) + fire-and-forget sync function that fetches from the Railway Voyager worker, matches participants to Person records by LinkedIn URL, and upserts into PostgreSQL; portal API route returns 202 + existing conversations while triggering async sync with a 5-minute per-sender cooldown**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-11T13:26:51Z
- **Completed:** 2026-03-11T13:29:22Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- 3 new Prisma models applied to Neon PostgreSQL via `npx prisma db push`
- `syncLinkedInConversations()` with full upsert logic, Person URL matching, and try/catch safety
- `POST /api/portal/inbox/linkedin/sync` with 202 fire-and-forget pattern and 5-min cooldown
- VoyagerConversation and VoyagerMessage interfaces exported from types.ts (avoids reaching into worker/)
- Full project type-checks with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Prisma models and extend types** - `3e25e52` (feat)
2. **Task 2: Build sync logic and portal API route** - `6bcfb06` (feat)

**Plan metadata:** (see below — final commit)

## Files Created/Modified
- `prisma/schema.prisma` - Added LinkedInConversation, LinkedInMessage, LinkedInSyncStatus models; added 2 relations to Sender model
- `src/lib/linkedin/types.ts` - Appended VoyagerConversation and VoyagerMessage interfaces
- `src/lib/linkedin/sync.ts` - Core sync function: worker fetch, Person URL matching, upsert, sync status tracking
- `src/app/api/portal/inbox/linkedin/sync/route.ts` - POST handler: 202 fire-and-forget sync, 5-min cooldown, existing conversations always returned

## Decisions Made
- `personId` not updated on re-sync — initial Person match is authoritative. Prevents re-matching issues when LinkedIn URLs change format between syncs.
- Sender filter uses `status: "active"` only (not `sessionStatus`) — senders with expired Voyager sessions should still display their previously-synced conversations.
- `participantProfileUrl` stored as normalized `/in/username` form — makes future queries consistent.
- `LinkedInSyncStatus` is a separate model, not a field on Sender — cleaner separation, avoids adding migration-sensitive columns to a frequently-modified table.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three Prisma models exist in the database and are type-safe via Prisma Client
- `syncLinkedInConversations()` is ready for Phase 36 to call directly or indirectly via the portal sync route
- `POST /api/portal/inbox/linkedin/sync` response shape `{ conversations, lastSyncedAt, syncing }` is what Phase 36 inbox UI should poll
- Messages endpoint (per-conversation on-demand fetch) is deferred to Phase 36 per CONTEXT.md decisions

---
*Phase: 34-linkedin-data-layer*
*Completed: 2026-03-11*
