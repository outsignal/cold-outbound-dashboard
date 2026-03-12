# Phase 39: Webhook Reply Migration - Research

**Researched:** 2026-03-12
**Domain:** Trigger.dev v4 task triggering from Next.js webhook handler
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**1. Task Granularity — Two tasks**

Two Trigger.dev tasks, not a single mega-task:

- **`process-reply`** — reply persistence, classification, notifications, and AI suggestion. These form a natural chain: save → classify → notify (with classification) → generate AI suggestion. Splitting further adds orchestration overhead with no benefit.
- **`linkedin-fast-track`** — priority bump / new P1 connection enqueue. Completely independent: different service, different failure mode, different retry semantics.

LinkedIn sequence rules on EMAIL_SENT stay inline — they're fast DB queries + enqueues, not external calls.

**2. What stays inline vs. what moves to tasks**

Inline (before returning 200):
- Rate limit + signature verification
- Payload parsing + OOO detection
- WebhookEvent creation (audit trail — must exist before 200)
- Person/PersonWorkspace status updates ("replied" / "interested") — simple updateMany, ~10ms
- Bounce + unsubscribe handling — simple status updates
- LinkedIn sequence rule evaluation on EMAIL_SENT — DB queries + enqueue, no external calls

Moved to Trigger.dev tasks:
- Reply persistence + classification → `process-reply` task
- LinkedIn fast-track (bumpPriority / enqueueAction on reply) → `linkedin-fast-track` task
- Notifications (Slack + email) → inside `process-reply` task (after classification)
- AI suggestion generation → inside `process-reply` task (after notification)

Rule: Anything hitting an external API (Anthropic, Slack, Resend) or taking >1s moves to a task. Pure DB writes <50ms stay inline.

**3. Fallback behavior**

If `tasks.trigger("process-reply", ...)` throws:
- Catch and run classification + notification inline (like today). This is the critical path — user must know about the reply.
- Log: `[webhook] Trigger.dev unavailable, falling back to inline processing`

If `tasks.trigger("linkedin-fast-track", ...)` throws:
- Log warning and skip. LinkedIn fast-track is best-effort.

"Unavailable" = `tasks.trigger()` throws an exception. No health-check beforehand — just try and catch.

**4. Notification timing**

Notifications move INTO the `process-reply` task, firing AFTER classification but BEFORE AI suggestion.

New flow: persist reply → classify (~2-3s) → notify WITH classification info (intent, sentiment) → generate AI suggestion → persist + send suggestion as follow-up Slack message.

Fallback path still notifies immediately with inline classification, so worst case = identical to today.

### Claude's Discretion

- Payload shape passed to `process-reply` and `linkedin-fast-track` tasks — design what data those tasks need
- Retry configuration for each task
- idempotency key strategy for `process-reply`
- Queue assignment for each task
- `maxDuration` for each task

### Deferred Ideas (OUT OF SCOPE)

_None identified._
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WHOOK-01 | Reply classification moved from inline webhook to Trigger.dev task | `process-reply` task wraps `classifyReply()` + persists result; fallback pattern re-runs inline |
| WHOOK-03 | LinkedIn fast-track actions moved to Trigger.dev task | `linkedin-fast-track` task wraps `bumpPriority()` + `enqueueAction()`; fallback logs + skips |
| WHOOK-04 | Webhook handler reduced to: verify → write event → trigger task → return 200 | `tasks.trigger()` is a non-blocking API call from Next.js; maxDuration can drop to 10s |
| WHOOK-05 | Fallback pattern for task trigger failure (inline classification if Trigger.dev unavailable) | `tasks.trigger()` throws on failure; catch block re-runs inline path |
</phase_requirements>

---

## Summary

Phase 38 shipped a verified Trigger.dev foundation: Prisma binary target, env var sync, concurrency queues, smoke test passing all 5 services. Phase 39 makes the first real use of that foundation — migrating the EmailBison webhook handler from a fire-and-forget pattern (`.then()` chains, 60s maxDuration) to a clean trigger-and-return pattern (<500ms, 10s maxDuration).

The webhook handler (`src/app/api/webhooks/emailbison/route.ts`) currently does three heavyweight things in sequence: persists + classifies the reply (Anthropic call, ~2-3s), fires notifications (Slack + Resend, ~2s), and generates an AI suggestion in a detached `.then()` chain. The `.then()` chain is the silent failure pattern — Vercel kills it when the serverless function exits. Moving these to Trigger.dev tasks gives them their own retry budget, observability, and guaranteed execution.

Two new task files land in `trigger/`: `process-reply.ts` and `linkedin-fast-track.ts`. The webhook handler gains try/catch around each `tasks.trigger()` call with clear fallback behavior. The existing `notifyReply()` and `classifyReply()` functions are imported directly into the tasks — no changes to those libraries needed.

**Primary recommendation:** Use `tasks.trigger()` (not `triggerAndWait`) from the webhook handler — fire-and-return is the entire point. Import task types with `import type` to avoid bundling task code into the Next.js route. Use `ebReplyId` as the idempotency key for `process-reply` to prevent double-processing on webhook retries.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@trigger.dev/sdk` | ^4.4.3 (installed) | Task definition + triggering | Already installed, smoke test verified |
| `@trigger.dev/build` | ^4.4.3 (installed) | Build extension (Prisma legacy mode) | Already configured in trigger.config.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `anthropicQueue` | (trigger/queues.ts) | Concurrency limiting for Anthropic calls | classifyReply + generateReplySuggestion both hit Anthropic — both must use this queue |
| Prisma client | (via prismaExtension legacy mode) | DB access from tasks | Already configured — `new PrismaClient()` at task module scope (same pattern as smoke-test.ts) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tasks.trigger()` fire-and-return | `tasks.triggerAndWait()` | triggerAndWait blocks webhook response — defeats the purpose |
| `import type` for task types | Full import of task module in webhook | Full import pulls task code + all its deps into Next.js bundle — use `import type` only |

**Installation:** No new packages needed. Everything is already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
trigger/
├── queues.ts                 # (exists) anthropicQueue, emailBisonQueue
├── smoke-test.ts             # (exists) diagnostic tool
├── process-reply.ts          # NEW — reply persistence + classification + notify + AI suggestion
└── linkedin-fast-track.ts    # NEW — bumpPriority or enqueue P1 connect on reply
```

### Pattern 1: Triggering a Task from a Next.js API Route (Fire-and-Return)

**What:** Use `tasks.trigger()` with a type-only import of the task. Returns a handle immediately without waiting for task completion.

**When to use:** Webhook handlers, any route that must return quickly.

```typescript
// Source: https://trigger.dev/docs/triggering
import { tasks } from "@trigger.dev/sdk";
import type { processReply } from "~/trigger/process-reply";

// In the webhook POST handler, after writing WebhookEvent:
try {
  await tasks.trigger<typeof processReply>("process-reply", {
    replyData: { /* ... */ },
    workspaceSlug,
  }, {
    idempotencyKey: `reply-${ebReplyId}`,
    tags: [workspaceSlug],
  });
} catch (err) {
  console.error("[webhook] Trigger.dev unavailable, falling back to inline processing", err);
  // inline fallback: classifyReply() + notifyReply()
}
```

**Critical:** `import type` not `import` — never import the actual task module into the webhook route.

### Pattern 2: Task Definition with Queue and Retry

**What:** Task with declared queue, retry config, and Prisma client at module scope.

```typescript
// Source: https://trigger.dev/docs/tasks/overview + smoke-test.ts pattern
import { task } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { anthropicQueue } from "./queues";

const prisma = new PrismaClient();

export const processReply = task({
  id: "process-reply",
  queue: anthropicQueue,     // shares concurrencyLimit: 3 with other Anthropic tasks
  maxDuration: 120,          // 2 min ceiling — classification + notify + AI suggestion
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10_000,
  },
  run: async (payload: ProcessReplyPayload) => {
    // 1. upsert Reply record
    // 2. classifyReply()
    // 3. notifyReply() with classification
    // 4. generateReplySuggestion() + persist + Slack follow-up
  },
});
```

### Pattern 3: Idempotency Key for Webhook Dedup

**What:** Pass `ebReplyId` as the idempotency key so duplicate webhook deliveries don't double-process.

```typescript
await tasks.trigger<typeof processReply>("process-reply", payload, {
  idempotencyKey: `reply-${ebReplyId}`,
  tags: [workspaceSlug],
});
```

If EmailBison retries the webhook (connection timeout, etc.), the second `tasks.trigger()` call with the same key returns the existing run handle without creating a new run.

### Pattern 4: linkedin-fast-track Task (Best-Effort, No Fallback)

```typescript
try {
  await tasks.trigger<typeof linkedinFastTrack>("linkedin-fast-track", {
    personEmail: leadEmail,
    workspaceSlug,
    senderEmail,
  }, {
    tags: [workspaceSlug],
  });
} catch (err) {
  console.warn("[webhook] linkedin-fast-track trigger failed, skipping:", err);
  // No inline fallback — log and continue
}
```

### Anti-Patterns to Avoid

- **Fire-and-forget `.then()` chains in the webhook handler:** This is exactly what we're replacing. Once the serverless function exits, detached promises die silently.
- **Importing task modules (not `import type`) in Next.js routes:** Causes Next.js to bundle Prisma binary targets and task-only code into the API route bundle, leading to build failures.
- **Using `triggerAndWait` in a webhook handler:** Blocks the response until the task completes, making the webhook slow and risking EmailBison retries.
- **Health-checking Trigger.dev before triggering:** Adds latency and a second failure mode. The decided pattern is: try → catch → fallback.
- **Nesting `process-reply` and `linkedin-fast-track` in a parent task:** Adds orchestration overhead. Trigger both independently from the webhook handler.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dedup on webhook retries | Custom "already processed" DB check | `idempotencyKey` on `tasks.trigger()` | Built into the SDK — dedups at the platform level, not just DB level |
| Retry with exponential backoff | Custom retry loop in task | Task-level `retry` config | SDK handles backoff, jitter, maxAttempts |
| Task observability | Custom logging tables | Trigger.dev dashboard | All runs visible with payload, logs, duration, status — free |

---

## Common Pitfalls

### Pitfall 1: Importing Task Module into Next.js Route (Bundle Contamination)
**What goes wrong:** `import { processReply } from "~/trigger/process-reply"` in the webhook route causes Next.js to include the task's full dependency tree (Prisma binary, etc.) in the API route bundle. Build may fail or produce an oversized bundle.
**Why it happens:** Next.js bundles all static imports. Task files are not meant to run in the Next.js runtime.
**How to avoid:** Always use `import type { processReply }` (type-only). Then trigger by string ID: `tasks.trigger<typeof processReply>("process-reply", payload)`.
**Warning signs:** Build warnings about binary files; unusually large API route bundle.

### Pitfall 2: Webhook `maxDuration` Still Set to 60
**What goes wrong:** After the migration, the webhook handler no longer needs 60s — it returns in <500ms. Leaving `maxDuration = 60` wastes Vercel compute budget on every request.
**Why it happens:** Easy to forget to update when the handler is simplified.
**How to avoid:** Lower `maxDuration` to 10 in the webhook route after migration.

### Pitfall 3: Fallback Path Uses `.then()` Instead of `await`
**What goes wrong:** If the catch block in the fallback fires an async function without `await`, you've re-introduced fire-and-forget. Vercel kills it again when the serverless function exits.
**Why it happens:** Reflex to keep the pattern from the original code.
**How to avoid:** In the fallback block, `await classifyReply()` and `await notifyReply()` synchronously before returning 200. This is the accepted tradeoff — if Trigger.dev is unavailable, the webhook takes slightly longer but processing is guaranteed.

### Pitfall 4: Prisma Client Instantiated Inside `run()` Per-Invocation
**What goes wrong:** Prisma connection pool gets exhausted — each task run opens a new connection that isn't cleaned up between retries.
**Why it happens:** Natural reflex to put client instantiation inside the function.
**How to avoid:** Instantiate `const prisma = new PrismaClient()` at module scope, outside `task({...})`. This is the established pattern from `smoke-test.ts`.

### Pitfall 5: process-reply Task Doesn't Guard Against Double Notification
**What goes wrong:** If the task retries (e.g., after a transient Anthropic failure), `notifyReply()` fires again, sending duplicate Slack/email notifications to the client.
**Why it happens:** The task retries from the top on failure — all steps re-run.
**How to avoid:** `notifyReply()` already checks `reply.notifiedAt` — if the reply was already notified, it returns early. This guard is already in place. Verify it persists `notifiedAt` on first successful notification and confirm the task respects it.

### Pitfall 6: Missing `TRIGGER_SECRET_KEY` in Vercel Production
**What goes wrong:** `tasks.trigger()` throws immediately — every webhook falls back to inline, defeating the migration entirely.
**Why it happens:** Env var not synced to production at deploy time.
**How to avoid:** TRIGGER_SECRET_KEY is already synced via the Vercel integration (Phase 38-02). Verify it's present in Vercel dashboard under the production environment before deploying Phase 39.

---

## Code Examples

### process-reply Task Payload Shape

```typescript
// What the webhook passes to the task
interface ProcessReplyPayload {
  workspaceSlug: string;
  ebReplyId: string | number;           // for idempotency + upsert key
  eventType: string;                     // LEAD_REPLIED | LEAD_INTERESTED | UNTRACKED_REPLY_RECEIVED
  leadEmail: string;
  leadName: string | null;
  senderEmail: string | null;
  subject: string | null;
  textBody: string | null;
  interested: boolean;
  campaignId: string | null;
  webhookEventId: string;               // FK for Reply.webhookEventId
  // Raw reply data needed for upsert
  replyFromEmail: string;
  replyFromName: string | null;
  replyBodyText: string;
  replyHtmlBody: string | null;
  replyReceivedAt: string;              // ISO string (dates don't serialize in JSON)
  replyParentId: string | null;
  replySenderEmailId: string | null;
  direction: "inbound" | "outbound";
  sequenceStep: number | null;
}
```

### linkedin-fast-track Task Payload Shape

```typescript
interface LinkedinFastTrackPayload {
  personEmail: string;
  workspaceSlug: string;
  senderEmail: string | null;
  campaignName: string | null;
}
```

### Webhook Handler Skeleton After Migration

```typescript
// src/app/api/webhooks/emailbison/route.ts (post-migration shape)
export const maxDuration = 10;  // down from 60 — no longer waiting for external APIs

export async function POST(request: NextRequest) {
  // 1. Rate limit + signature verify
  // 2. Parse payload + detect OOO
  // 3. Write WebhookEvent (inline — audit trail)
  // 4. Update person/personWorkspace status (inline — fast DB writes)
  // 5. Handle EMAIL_SENT LinkedIn sequence rules (inline — no external APIs)
  // 6. Handle bounce/unsubscribe status (inline — fast DB writes)

  // 7. Trigger process-reply (with fallback)
  if (replyEvents.includes(eventType) && !isAutomatedFlag && ebReplyId != null) {
    try {
      await tasks.trigger<typeof processReply>("process-reply", { /* payload */ }, {
        idempotencyKey: `reply-${ebReplyId}`,
        tags: [workspaceSlug],
      });
    } catch (err) {
      console.error("[webhook] Trigger.dev unavailable, falling back to inline processing", err);
      // inline: upsert Reply + classifyReply + update intent + notifyReply
      // all awaited — no fire-and-forget
    }
  }

  // 8. Trigger linkedin-fast-track (best-effort, no fallback)
  if (linkedInTriggerEvents.includes(eventType) && leadEmail) {
    try {
      await tasks.trigger<typeof linkedinFastTrack>("linkedin-fast-track", { /* payload */ }, {
        tags: [workspaceSlug],
      });
    } catch (err) {
      console.warn("[webhook] linkedin-fast-track trigger failed, skipping:", err);
    }
  }

  return NextResponse.json({ received: true });
}
```

---

## What Stays in the Webhook vs. What Moves

### Inline (stays in webhook — confirmed by CONTEXT.md decisions)

| Code Block | Why Inline |
|-----------|------------|
| `verifyWebhookSignature()` | Must happen before returning 200 |
| `prisma.webhookEvent.create()` | Audit trail — must exist before 200 |
| `person.updateMany({ status: "contacted" })` on EMAIL_SENT | Simple DB write, <10ms |
| `evaluateSequenceRules()` + `enqueueAction()` on EMAIL_SENT | Pure DB operations, no external APIs |
| `person.updateMany({ status: newStatus })` on reply events | Simple DB write, <10ms |
| Bounce/unsubscribe `updateMany` | Simple DB write, <10ms |

### Moves to tasks (confirmed by CONTEXT.md decisions)

| Code Block | Destination Task |
|-----------|-----------------|
| Reply upsert + all reply persistence fields | `process-reply` |
| `classifyReply()` + update intent/sentiment | `process-reply` |
| `notifyReply()` (Slack + email) | `process-reply` (after classification) |
| `generateReplySuggestion()` + persist `aiSuggestedReply` + Slack follow-up | `process-reply` (after notification) |
| LinkedIn fast-track: `bumpPriority()` / `enqueueAction()` on LEAD_REPLIED | `linkedin-fast-track` |

---

## Existing Code That Tasks Can Reuse Directly

All the following are importable from task files with no modification:

| Module | Export | Used By |
|--------|--------|---------|
| `@/lib/classification/classify-reply` | `classifyReply()` | `process-reply` |
| `@/lib/classification/strip-html` | `stripHtml()` | `process-reply` |
| `@/lib/notifications` | `notifyReply()` | `process-reply` |
| `@/lib/slack` | `postMessage()` | `process-reply` (AI suggestion Slack message) |
| `@ai-sdk/anthropic` + `ai` | `generateText()` | `process-reply` (AI suggestion) |
| `@/lib/linkedin/queue` | `bumpPriority()`, `enqueueAction()` | `linkedin-fast-track` |
| `@/lib/linkedin/sender` | `assignSenderForPerson()` | `linkedin-fast-track` |

**Note:** These modules use `@/lib/db` (`import { prisma }`) for their Prisma client. Task files must NOT use the singleton `prisma` from `@/lib/db` — they must instantiate their own `new PrismaClient()` at module scope. This means `notifyReply()` and `classifyReply()` as currently written will use `@/lib/db`'s prisma client. This is a concern — see Open Questions.

---

## Open Questions

1. **Can task files import `@/lib/notifications` (which uses `@/lib/db` prisma singleton)?**
   - What we know: `smoke-test.ts` uses its own `new PrismaClient()`. The lib files use the singleton from `@/lib/db`.
   - What's unclear: Whether the Trigger.dev Prisma extension in legacy mode supports the singleton pattern, or whether tasks must always use a fresh `new PrismaClient()`.
   - Recommendation: Safest approach is to use `@/lib/db`'s prisma inside notification/classify calls (they already have it) and instantiate a separate `new PrismaClient()` only for direct task queries (reply upsert, workspace lookup). This matches `smoke-test.ts` which instantiates at module scope. If the build fails due to the singleton, the fallback is to pass prisma as a parameter or inline the DB queries.

2. **Does `notifyReply()` already handle the `notifiedAt` guard correctly for task retries?**
   - What we know: `notifyReply()` checks `replyRecord?.notifiedAt` at the top — if set, it returns early.
   - What's unclear: Whether the function sets `notifiedAt` on successful notification (need to verify this is written in the function body).
   - Recommendation: Read the full `notifyReply()` body to confirm `notifiedAt` is written after successful notification before writing the task.

3. **Tags in Trigger.dev v4 — string array or key-value?**
   - What we know: The triggering docs show `tags: ["important", "user-123"]` (string array). The tasks overview doc shows `tags: Record<string, string>` in some examples.
   - Recommendation: Use string array (`tags: [workspaceSlug]`). Verify at task test time.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateReplySuggestion().then(...)` fire-and-forget | `process-reply` Trigger.dev task with guaranteed execution + retries | Phase 39 | Silent failures eliminated |
| Inline `classifyReply()` blocking webhook response | Classification in task, reply saved with `intent=null`, task fills it in | Phase 39 | Webhook returns in <100ms instead of 3-5s |
| Notification fires before classification (bare notification + later update) | Notification fires AFTER classification with intent/sentiment included | Phase 39 | Richer notifications, single notification per reply |
| `maxDuration = 60` on webhook handler | `maxDuration = 10` | Phase 39 | Reduced Vercel compute costs |

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in config.json — skipping this section.

---

## Sources

### Primary (HIGH confidence)
- https://trigger.dev/docs/triggering — `tasks.trigger()` API, type-only import pattern, idempotency keys, tags
- https://trigger.dev/docs/tasks/overview — Task definition pattern, file location convention
- https://trigger.dev/docs/errors-retrying — Retry configuration, AbortTaskRunError
- `/Users/jjay/programs/outsignal-agents/trigger/queues.ts` — Existing queue definitions (anthropicQueue, emailBisonQueue)
- `/Users/jjay/programs/outsignal-agents/trigger/smoke-test.ts` — Established task pattern for this project (PrismaClient at module scope)
- `/Users/jjay/programs/outsignal-agents/trigger.config.ts` — Project ref from env, prismaExtension legacy mode, dirs: ["./trigger"]
- `/Users/jjay/programs/outsignal-agents/src/app/api/webhooks/emailbison/route.ts` — Full current webhook implementation
- `/Users/jjay/programs/outsignal-agents/src/lib/classification/classify-reply.ts` — classifyReply function signature
- `/Users/jjay/programs/outsignal-agents/src/lib/notifications.ts` — notifyReply signature + notifiedAt guard

### Secondary (MEDIUM confidence)
- `@trigger.dev/sdk` version ^4.4.3 confirmed in package.json — matches docs researched

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and smoke-tested in Phase 38
- Architecture: HIGH — official docs verified triggering pattern + type-only import; task pattern confirmed from smoke-test.ts
- Pitfalls: HIGH — bundle contamination (type-only import) is explicitly documented; notifiedAt guard is in existing code

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (Trigger.dev v4 is stable; SDK at ^4.4.3 pinned in package.json)
