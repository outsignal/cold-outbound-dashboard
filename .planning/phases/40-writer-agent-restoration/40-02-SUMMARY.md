---
phase: 40-writer-agent-restoration
plan: "02"
started: 2026-03-12
completed: 2026-03-12
status: complete
---

# Plan 40-02 Summary: Wire process-reply to generate-suggestion

## What was done
Replaced inline Haiku `generateText()` call in Step 4 of `trigger/process-reply.ts` with `tasks.trigger("generate-suggestion", { replyId, workspaceSlug })`. The Opus writer agent now handles AI reply suggestions via a separate Trigger.dev task with independent retry and no timeout constraint.

## Changes
- Removed `anthropic` import from `@ai-sdk/anthropic`
- Removed `generateText` import from `ai`
- Removed inline AI suggestion generation (~40 lines)
- Added `tasks.trigger("generate-suggestion", ...)` call (fire-and-forget from process-reply's perspective)
- process-reply completes after notification; suggestion generation continues asynchronously

## Key files
### Modified
- `trigger/process-reply.ts` — Step 4 replaced

## Deviations
None — matched plan exactly.

## Self-Check: PASSED
- [x] `tasks.trigger("generate-suggestion")` present in process-reply.ts
- [x] No `generateText` or `@ai-sdk/anthropic` imports remain in process-reply.ts
- [x] TypeScript compiles without errors
