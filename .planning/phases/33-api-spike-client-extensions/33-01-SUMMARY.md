---
phase: 33-api-spike-client-extensions
plan: "01"
subsystem: emailbison-client
tags: [spike, api-validation, emailbison, typescript, client-extension]
dependency_graph:
  requires: []
  provides: [emailbison-sendreply-validated, emailbison-client-inbox-methods, emailbison-typed-errors]
  affects: [phases/35-email-thread-ui, phases/36-linkedin-thread-ui]
tech_stack:
  added: []
  patterns: [spike-first-validation, additive-client-extension, typed-error-class]
key_files:
  created:
    - scripts/spike-emailbison-reply.ts
  modified:
    - src/lib/emailbison/types.ts
    - src/lib/emailbison/client.ts
    - src/components/inbox/reply-detail.tsx
decisions:
  - "sendReply requires to_emails[] OR reply_all:true in addition to message + sender_email_id — not documented, only revealed by spike"
  - "sendReply response is { data: { success, message, reply: Reply } } — NOT { data: Reply } as originally assumed"
  - "ReplyRecipient.address is the correct field name (not .email) — corrected from spike"
  - "EmailBisonError is public-facing error class; internal EmailBisonApiError handles retry logic and is unchanged"
  - "reply_all:true is the recommended approach for sendReply — avoids manually extracting recipient emails"
metrics:
  duration: "~4 minutes"
  completed: "2026-03-11"
  tasks_completed: 1
  files_created: 1
  files_modified: 3
---

# Phase 33 Plan 01: EmailBison API Spike + Client Extensions Summary

**One-liner:** Live spike validated POST /replies/{id}/reply on white-label URL with discovery of required `reply_all` param; client extended with `sendReply()`, `getReply()`, `getRepliesPage()` and typed `EmailBisonError` class.

## What Was Built

### Spike Script (`scripts/spike-emailbison-reply.ts`)

A raw-fetch spike script that:
1. Fetched GET /replies?page=1 using the Outsignal internal workspace token
2. Logged the first reply object in full — discovered 4 undocumented fields
3. Called POST /replies/{id}/reply and documented the actual response shape
4. Tested 422 error shape by omitting required fields

The spike ran successfully and sent a real reply to reply ID 9632 in the Outsignal workspace.

### Types Updated (`src/lib/emailbison/types.ts`)

- `ReplyRecipient.email` renamed to `ReplyRecipient.address` — corrected from spike output
- `Reply` interface extended with: `parent_id: number | null`, `raw_body: string | null`, `headers: string | null`, `raw_message_id: string | null`
- `Reply.folder` and `Reply.type` union types extended to include `"Sent"` and `"Outgoing Email"` variants
- New `SendReplyParams` interface (message, sender_email_id, to_emails, reply_all, reply_template_id)
- New `SendReplyResponse` interface (data.success, data.message, data.reply)
- New exported `EmailBisonError` class with code, statusCode, rawBody properties

### Client Extended (`src/lib/emailbison/client.ts`)

Three new methods added (no existing methods modified):
- `getReply(replyId)` — fetch single reply by ID
- `getRepliesPage(page)` — fetch one page of replies (for inbox pagination control)
- `sendReply(replyId, params)` — send reply with API shape validation and EmailBisonError on unexpected response

### Bug Fix (`src/components/inbox/reply-detail.tsx`)

Fixed `r.email` → `r.address` on ReplyRecipient objects (Rule 1 auto-fix — the type correction would have broken this file).

## Spike Findings

| Question | Answer |
|----------|--------|
| Does POST /replies/{id}/reply work on white-label? | YES — app.outsignal.ai/api works |
| Required params beyond message? | `to_emails[]` OR `reply_all: true` required |
| Response shape? | `{ data: { success, message, reply: Reply } }` |
| Does Reply have parent_id? | YES — null on root, set to parent ID on replies |
| ReplyRecipient field name? | `address` not `email` |
| Additional Reply fields not in type? | `raw_body`, `headers`, `raw_message_id`, `parent_id` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ReplyRecipient.email → ReplyRecipient.address**
- **Found during:** Task 1, Step 4 (type updates from spike)
- **Issue:** The spike revealed `to[].address` not `to[].email` in the API response. The existing `ReplyRecipient` interface and one usage in `reply-detail.tsx` used `.email`.
- **Fix:** Updated `ReplyRecipient.address` in types.ts and fixed the one usage in reply-detail.tsx line 104.
- **Files modified:** `src/lib/emailbison/types.ts`, `src/components/inbox/reply-detail.tsx`
- **Commit:** c7d2385

**2. [Rule 2 - Missing fields] Added raw_body, headers, raw_message_id to Reply type**
- **Found during:** Task 1, Step 4 (spike revealed additional fields)
- **Issue:** Spike output showed 4 fields not in the existing Reply type: `parent_id`, `raw_body`, `headers`, `raw_message_id`
- **Fix:** Added all 4 fields to the Reply interface (parent_id was already planned; the other 3 were discovered during spike)
- **Files modified:** `src/lib/emailbison/types.ts`
- **Commit:** c7d2385

**3. [Rule 1 - Bug] SendReplyParams includes reply_all + to_emails**
- **Found during:** Task 1, Step 2 (first spike attempt returned 422)
- **Issue:** Initial params of `{ message, sender_email_id }` returned 422 with "to_emails field required unless reply_all is true" — the API requires recipient specification
- **Fix:** Updated SendReplyParams to include `to_emails?: string[]` and `reply_all?: boolean` fields; spike retried with `reply_all: true` and succeeded
- **Files modified:** `src/lib/emailbison/types.ts`
- **Commit:** c7d2385

## Self-Check: PASSED

- FOUND: scripts/spike-emailbison-reply.ts
- FOUND: src/lib/emailbison/types.ts (contains SendReplyParams, parent_id, EmailBisonError)
- FOUND: src/lib/emailbison/client.ts (contains sendReply, getReply, getRepliesPage)
- FOUND: commit c7d2385
- TypeScript compilation: PASSED (npx tsc --noEmit — zero errors)
