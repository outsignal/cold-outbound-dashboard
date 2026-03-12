---
phase: 39-webhook-reply-migration
verified: 2026-03-12T16:00:00Z
status: human_needed
score: 9/9 must-haves verified
human_verification:
  - test: "Send a real reply through EmailBison and check Trigger.dev dashboard"
    expected: "Reply arrives, webhook returns 200 fast, within 30s the Reply DB record has intent populated — visible in Trigger.dev run history with workspace slug tag"
    why_human: "Async task execution and actual webhook timing cannot be verified by static code analysis"
  - test: "Simulate Trigger.dev unavailability (temporarily revoke TRIGGER_SECRET_KEY) and send a test webhook"
    expected: "Webhook returns 200, error log shows '[webhook] Trigger.dev unavailable, falling back to inline processing', and Reply record in DB has intent populated from inline fallback"
    why_human: "Fallback code path correctness requires live execution; static analysis confirms the code exists but not that the catch branch fires as intended"
  - test: "Check Trigger.dev dashboard for linkedin-fast-track run history after a LEAD_REPLIED event"
    expected: "Run appears with correct workspaceSlug tag and shows either bumped=true or enqueued=true in the output"
    why_human: "LinkedIn fast-track task execution and workspace tagging requires live Trigger.dev environment"
---

# Phase 39: Webhook Reply Migration Verification Report

**Phase Goal:** The EmailBison webhook handler returns 200 immediately and all reply processing (classification, LinkedIn fast-track) runs as Trigger.dev tasks — ending the fire-and-forget silent failure pattern
**Verified:** 2026-03-12T16:00:00Z
**Status:** human_needed (all automated checks passed; 3 items require live execution to confirm)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | process-reply task persists Reply via upsert, classifies via classifyReply(), notifies via notifyReply() with classification, and generates AI suggestion via generateReplySuggestion() | VERIFIED | `trigger/process-reply.ts` lines 125-287 — 4-step run() body confirmed |
| 2 | linkedin-fast-track task looks up person by email, calls bumpPriority() or enqueues P1 connection via enqueueAction() | VERIFIED | `trigger/linkedin-fast-track.ts` lines 31-93 — full logic confirmed |
| 3 | process-reply uses anthropicQueue for concurrency limiting | VERIFIED | `trigger/process-reply.ts` line 38: `queue: anthropicQueue` |
| 4 | Both tasks have retry config with maxAttempts: 3 (process-reply) and maxAttempts: 2 (linkedin-fast-track) with exponential backoff | VERIFIED | process-reply lines 40-45; linkedin-fast-track lines 20-25 |
| 5 | PrismaClient instantiated at module scope (not inside run()) | VERIFIED | Both task files: `const prisma = new PrismaClient()` at top level, line 11 each |
| 6 | Webhook handler returns 200 without inline Anthropic calls — maxDuration reduced to 10 | VERIFIED | route.ts line 16: `export const maxDuration = 10`; no `generateText` or `@ai-sdk/anthropic` imports present |
| 7 | tasks.trigger('process-reply', ...) fires with idempotencyKey `reply-${ebReplyId}` and tags [workspaceSlug] | VERIFIED | route.ts lines 270-294: trigger call with `idempotencyKey: \`reply-${ebReplyId}\`` and `tags: [workspaceSlug]` |
| 8 | tasks.trigger('linkedin-fast-track', ...) fires with tags [workspaceSlug] | VERIFIED | route.ts lines 412-422: trigger call with `tags: [workspaceSlug]` |
| 9 | Fire-and-forget .then() chain for AI suggestion is gone — fallback path uses await throughout | VERIFIED | grep for `.then(` in route.ts: zero matches; fallback at lines 299-387 uses `await` for all calls |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `trigger/process-reply.ts` | Full reply processing chain (upsert/classify/notify/AI suggestion) as Trigger.dev task | VERIFIED | 289 lines — all 4 steps present and substantive |
| `trigger/linkedin-fast-track.ts` | P1 LinkedIn fast-track logic as Trigger.dev task | VERIFIED | 95 lines — bumpPriority + assignSenderForPerson + enqueueAction fully implemented |
| `src/app/api/webhooks/emailbison/route.ts` | Refactored webhook — slim, fast, tasks.trigger() calls with fallback | VERIFIED | 462 lines — task triggers in place, maxDuration=10, no inline AI calls |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `trigger/process-reply.ts` | `@/lib/classification/classify-reply` | import | VERIFIED | Line 5: `import { classifyReply }` |
| `trigger/process-reply.ts` | `@/lib/notifications` | import | VERIFIED | Line 6: `import { notifyReply }` |
| `trigger/process-reply.ts` | `./queues` | import | VERIFIED | Line 8: `import { anthropicQueue }` |
| `trigger/linkedin-fast-track.ts` | `@/lib/linkedin/queue` | import | VERIFIED | Line 3: `import { bumpPriority, enqueueAction }` |
| `trigger/linkedin-fast-track.ts` | `@/lib/linkedin/sender` | import | VERIFIED | Line 4: `import { assignSenderForPerson }` |
| `src/app/api/webhooks/emailbison/route.ts` | `@trigger.dev/sdk` | import | VERIFIED | Line 3: `import { tasks }` |
| `src/app/api/webhooks/emailbison/route.ts` | `trigger/process-reply` | import type | VERIFIED | Line 13: `import type { processReply }` (relative path, not @/ alias — correct, trigger/ is outside src/) |
| `src/app/api/webhooks/emailbison/route.ts` | `trigger/linkedin-fast-track` | import type | VERIFIED | Line 14: `import type { linkedinFastTrack }` (relative path) |
| Both task files | `trigger/` dir (Trigger.dev discovery) | `dirs: ["./trigger"]` in trigger.config.ts | VERIFIED | Both files in trigger/ alongside queues.ts and smoke-test.ts |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| WHOOK-01 | 39-01 | Reply classification moved from inline webhook to Trigger.dev task | SATISFIED | classifyReply() called in process-reply task Step 2 (lines 171-199); not called inline in webhook happy path |
| WHOOK-03 | 39-01 | LinkedIn fast-track actions moved to Trigger.dev task | SATISFIED | linkedinFastTrack task handles all bumpPriority/enqueueAction logic; bumpPriority removed from webhook imports |
| WHOOK-04 | 39-02 | Webhook handler reduced to: verify → write event → trigger task → return 200 | SATISFIED | EMAIL_SENT LinkedIn sequence rules remain inline per documented plan decision (CONTEXT.md). Core reply processing offloaded. maxDuration=10, no inline Anthropic |
| WHOOK-05 | 39-02 | Fallback pattern for task trigger failure (inline classification if Trigger.dev unavailable) | SATISFIED | Catch block lines 296-388: upsert + classifyReply + notifyReply all awaited inline when tasks.trigger() throws |

**Note on WHOOK-02:** REQUIREMENTS.md line 22 shows WHOOK-02 ("AI reply suggestion restored to full writer agent") is mapped to Phase 40 (Pending) — not a gap in this phase.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/webhooks/emailbison/route.ts` | 438, 454 | `.catch(() => {})` on `notify()` calls | Info | Intentional — BOUNCE/UNSUBSCRIBED system notifications are non-critical; plan explicitly keeps these as fire-and-forget. Not a blocker. |
| `trigger/process-reply.ts` | 255 | `.catch()` on prisma.reply.update for AI suggestion persistence | Info | Intentional — AI suggestion persist failure is non-blocking; notification already fired. Not a blocker. |

No blocking anti-patterns found. No TODO/FIXME/placeholder comments. No stub implementations.

---

### Human Verification Required

#### 1. Live Trigger.dev Task Execution

**Test:** Send a reply to a campaign email monitored by EmailBison (or use the EmailBison test webhook UI to fire a LEAD_REPLIED event with a real reply ID)
**Expected:** Webhook returns 200 immediately; within 30 seconds, the Reply record in the DB has `intent` and `sentiment` populated; the Trigger.dev dashboard shows a `process-reply` run with the correct `workspaceSlug` tag
**Why human:** Async task execution timing and Trigger.dev run history require a live environment; static analysis confirms the trigger call exists but not that it actually fires and the task executes

#### 2. Fallback Path Live Test

**Test:** Temporarily invalidate the Trigger.dev credentials (TRIGGER_SECRET_KEY) and fire a test LEAD_REPLIED webhook; check Vercel logs and DB
**Expected:** Vercel function log shows `[webhook] Trigger.dev unavailable, falling back to inline processing`; Reply record in DB still has `intent` populated from the inline fallback classify path; webhook returned 200
**Why human:** The fallback catch branch requires tasks.trigger() to actually throw; can't simulate this via static analysis

#### 3. LinkedIn Fast-Track Tag Verification

**Test:** Trigger a LEAD_REPLIED event for a person with a `linkedinUrl` set; check Trigger.dev dashboard
**Expected:** A `linkedin-fast-track` run appears in Trigger.dev with the correct `workspaceSlug` tag; run output shows `bumped: true` or `enqueued: true`
**Why human:** LinkedIn task execution with workspace tagging requires live Trigger.dev + DB state

---

### Summary

All 9 automated truths verified against the actual codebase. The implementation matches plan specs precisely:

- Both Trigger.dev tasks exist, are substantive (not stubs), and are correctly wired to their dependencies
- The webhook handler is correctly slimmed — maxDuration reduced from 60 to 10, `generateReplySuggestion` removed, no inline Anthropic calls on the happy path
- Fire-and-forget `.then()` chains are completely eliminated (zero matches in webhook file)
- `import type` used for task references (no bundle contamination)
- Fallback path is fully awaited with proper try/catch nesting
- All 4 requirements (WHOOK-01, WHOOK-03, WHOOK-04, WHOOK-05) satisfied
- WHOOK-02 is correctly deferred to Phase 40

The only items requiring verification are runtime behaviors (actual task execution speed, fallback trigger conditions, Trigger.dev dashboard tagging) which cannot be confirmed through static code analysis.

---

_Verified: 2026-03-12T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
