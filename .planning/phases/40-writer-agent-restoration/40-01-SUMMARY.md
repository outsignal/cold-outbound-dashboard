---
phase: 40-writer-agent-restoration
plan: 01
subsystem: infra
tags: [trigger.dev, anthropic, claude-opus, writer-agent, reply-suggestion, slack]

# Dependency graph
requires:
  - phase: 39-webhook-reply-migration
    provides: anthropicQueue, process-reply task pattern, Trigger.dev infrastructure
  - phase: 38-triggerdev-foundation
    provides: Trigger.dev SDK, PrismaClient module-scope pattern
provides:
  - generate-suggestion Trigger.dev task (id: "generate-suggestion")
  - Full Opus writer agent invoked as background job for reply suggestions
  - Idempotency guard on Reply.aiSuggestedReply
  - Thread context loading from emailBisonParentId / leadEmail siblings
affects: [process-reply task (will trigger generate-suggestion instead of inline Haiku), Phase 40 plans 02+]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "generate-suggestion task: runAgent(writerConfig, ...) with 'suggest reply' prefix to activate writer Reply Suggestion Mode"
    - "Idempotency guard: check reply.aiSuggestedReply before generating to prevent duplicate Opus calls"
    - "Thread context: fetch siblings by emailBisonParentId (preferred) or leadEmail fallback"
    - "Error handling: re-throw errors to let Trigger.dev retry — no swallowing"

key-files:
  created:
    - trigger/generate-suggestion.ts
  modified: []

key-decisions:
  - "Writer in reply mode returns plain text (not JSON) — use result.text directly, not result.output"
  - "Only 2 retry attempts (not 3) — Opus calls are expensive, excessive retries burn budget"
  - "Thread context from emailBisonParentId preferred; leadEmail fallback for replies without parent threading"
  - "Both Slack calls wrapped in .catch(() => {}) — Slack failure must not block or fail the task"

patterns-established:
  - "Reply Suggestion Mode: user message must start with 'suggest reply' to activate non-PVP writer mode"
  - "generate-suggestion is a separate task from process-reply — Opus upgrade is a distinct delivery concern"

requirements-completed: [WHOOK-02]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 40 Plan 01: Generate Suggestion Task Summary

**Trigger.dev background task running full Opus writer agent (claude-opus-4-20250514) for AI reply suggestions, replacing inline Haiku shortcut in process-reply**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T15:40:33Z
- **Completed:** 2026-03-12T15:43:25Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `trigger/generate-suggestion.ts` as standalone Trigger.dev task
- Full writer agent (Opus + KB search + workspace tools) invoked via `runAgent(writerConfig, ...)` — no inline generateText
- Reply Suggestion Mode activated by "suggest reply" prefix, which bypasses PVP framework and spintax rules
- Thread context loaded from DB (emailBisonParentId siblings or leadEmail fallback)
- Idempotency guard prevents re-generating for already-processed replies
- Slack follow-up posted to workspace channel + REPLIES_SLACK_CHANNEL_ID

## Task Commits

Each task was committed atomically:

1. **Task 1: Create generate-suggestion Trigger.dev task** - `10216a3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `trigger/generate-suggestion.ts` - Trigger.dev task: loads reply context, runs writer agent (Opus), persists aiSuggestedReply, sends Slack follow-up

## Decisions Made
- Writer in reply mode returns plain prose, not JSON — `result.text` used directly as suggestion (not `result.output`)
- `maxAttempts: 2` (not 3) to avoid expensive duplicate Opus retries
- Thread context: `emailBisonParentId` preferred over `leadEmail` for thread grouping (more precise)
- Both Slack `postMessage` calls wrapped in `.catch(() => {})` — Slack failures must not block task success

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required beyond what was set up in Phase 38.

## Next Phase Readiness
- `generate-suggestion` task is ready to be triggered from `process-reply` (Phase 40, Plan 02)
- No changes to agent framework files — zero-touch upgrade path
- Task compiles cleanly (npx tsc --noEmit passes with no errors)

---
*Phase: 40-writer-agent-restoration*
*Completed: 2026-03-12*
