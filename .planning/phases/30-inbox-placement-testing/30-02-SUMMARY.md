---
phase: 30-inbox-placement-testing
plan: "02"
subsystem: api
tags: [placement-testing, emailbison, mail-tester, slack, email-notifications, prisma]

requires:
  - phase: 30-01
    provides: PlacementTest + EmailSenderHealth Prisma models, mail-tester.com client (getTestAddress, pollForResults, classifyScore), recommended-for-testing query

provides:
  - POST /api/placement-tests — full placement test lifecycle (get address, send via EmailBison dedi, poll results, score, upsert health, notify)
  - GET /api/placement-tests — test history by senderEmail with optional pending re-fetch
  - src/lib/placement/send-test.ts — sendTestEmail function via dedi.emailbison.com
  - src/lib/placement/notifications.ts — notifyPlacementResult for warning/critical scores only

affects:
  - 30-03-dashboard (consumes both endpoints)
  - 32-dashboard (was referenced as consumer in plan context)

tech-stack:
  added: []
  patterns:
    - "Placement test flow: POST creates record -> sends email -> polls -> scores -> upserts health -> notifies"
    - "notifyPlacementResult only fires for warning/critical — good scores (>=7) suppressed intentionally"
    - "Re-fetch pattern: GET ?refetch=true iterates pending tests and calls fetchTestResults individually"
    - "EmailSenderHealth upsert on bad scores — single record per senderEmail updated each test"

key-files:
  created:
    - src/lib/placement/send-test.ts
    - src/lib/placement/notifications.ts
    - src/app/api/placement-tests/route.ts
  modified: []

key-decisions:
  - "notifyPlacementResult suppresses good scores (>=7) — only warning + critical trigger alerts (per plan spec)"
  - "POST returns 202 (not 500) when results still pending after 60s — caller uses GET ?refetch=true to check later"
  - "testId extracted from testAddress string (format: test-xxx@srv1.mail-tester.com) for re-fetch in GET handler"
  - "dedi.emailbison.com used for test send (not app.outsignal.ai) — dedicated IPs reflect real campaign reputation"

patterns-established:
  - "placement/notifications.ts follows domain-health/notifications.ts exactly: audited() + verifySlackChannel + verifyEmailRecipients + buildEmailHtml"
  - "API route uses requireAdminAuth() + try/catch + structured { error } responses throughout"

requirements-completed: [PLACE-02, PLACE-03, PLACE-04]

duration: 4min
completed: 2026-03-11
---

# Phase 30 Plan 02: Placement Test API Endpoints Summary

**POST + GET /api/placement-tests endpoints completing the full inbox placement test lifecycle — auto-send via EmailBison dedicated IPs, poll mail-tester.com for scores, upsert EmailSenderHealth, and fire Slack/email alerts on warning/critical results**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-11T10:09:28Z
- **Completed:** 2026-03-11T10:12:08Z
- **Tasks:** 2
- **Files modified:** 3 (all created)

## Accomplishments
- `sendTestEmail` sends a realistic campaign-style HTML email to mail-tester.com test addresses via the dedicated IP endpoint (`dedi.emailbison.com`) so spam filters evaluate true dedicated IP reputation
- `notifyPlacementResult` delivers scored Slack blocks + HTML email alerts for warning/critical scores, wrapping both sends in `audited()` for notification audit trail
- POST endpoint handles the full placement test lifecycle: get test address, create pending record, send email, poll 60s, update score, upsert EmailSenderHealth, notify
- GET endpoint returns paginated test history per sender and re-fetches pending results on demand via `?refetch=true`

## Task Commits

1. **Task 1: EmailBison test send function + placement notifications** - `a5d7ff1` (feat)
2. **Task 2: POST and GET /api/placement-tests endpoints** - `2147f14` (feat)

## Files Created/Modified
- `src/lib/placement/send-test.ts` — `sendTestEmail()` via `dedi.emailbison.com` with realistic campaign HTML content
- `src/lib/placement/notifications.ts` — `notifyPlacementResult()` Slack + email alerts (warning/critical only), `audited()` wrapped
- `src/app/api/placement-tests/route.ts` — `POST` (trigger test) + `GET` (history + pending re-fetch), `maxDuration=60`

## Decisions Made
- POST returns `202` with refetch instructions when mail-tester.com results aren't ready after the 60s polling window, rather than failing the request — this is the expected path for slow mail servers
- `testId` is extracted from `testAddress` (format: `test-xxx@srv1.mail-tester.com`) in the GET re-fetch handler, since only the `testAddress` is persisted on the `PlacementTest` record
- Good scores (>=7) produce no notification — only warning (5-6.99) and critical (<5) alert admin, per the plan spec

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no new external service configuration required. Requires `MAILTESTER_API_KEY` env var (documented in 30-01). If not set, POST returns 503 with descriptive error.

## Next Phase Readiness
- Both endpoints are ready for Phase 30-03 dashboard to consume
- `GET /api/placement-tests?senderEmail=...` returns `{ tests, recommended }` for dashboard display
- `POST /api/placement-tests` returns the completed `PlacementTest` record (or 202 for pending)
- `EmailSenderHealth` records are upserted automatically — health status page can query these directly

---
*Phase: 30-inbox-placement-testing*
*Completed: 2026-03-11*

## Self-Check: PASSED

- `src/lib/placement/send-test.ts` — FOUND
- `src/lib/placement/notifications.ts` — FOUND
- `src/app/api/placement-tests/route.ts` — FOUND
- Commit `a5d7ff1` (Task 1) — FOUND
- Commit `2147f14` (Task 2) — FOUND
