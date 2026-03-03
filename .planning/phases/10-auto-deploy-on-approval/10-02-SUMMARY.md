---
phase: 10-auto-deploy-on-approval
plan: "02"
subsystem: linkedin-sequencing
tags: [linkedin, sequencing, handlebars, connection-poller, template-engine]
dependency_graph:
  requires:
    - 10-01 (CampaignDeploy model, deploy.ts)
    - prisma/schema.prisma (CampaignSequenceRule, LinkedInConnection models)
    - src/lib/linkedin/queue.ts (enqueueAction)
    - src/lib/linkedin/sender.ts (assignSenderForPerson)
  provides:
    - src/lib/linkedin/sequencing.ts (compileTemplate, buildTemplateContext, evaluateSequenceRules, createSequenceRulesForCampaign)
    - src/lib/linkedin/connection-poller.ts (pollConnectionAccepts, processConnectionCheckResult, getConnectionsToCheck)
  affects:
    - 10-03 (worker wiring — calls getConnectionsToCheck, processConnectionCheckResult, pollConnectionAccepts)
    - 10-04 (webhook handler — calls evaluateSequenceRules on EMAIL_SENT events)
tech_stack:
  added:
    - handlebars (^4.7.8) — already in package.json, confirmed present in node_modules
  patterns:
    - Handlebars compile with noEscape:true for plain-text LinkedIn messages
    - Rule evaluation returns action descriptors (caller enqueues — no side effects in evaluator)
    - Connection retry tracked via sequenceStepRef='connection_retry' on LinkedInAction
    - Sender health check at enqueue time for follow-up actions
key_files:
  created:
    - src/lib/linkedin/sequencing.ts
    - src/lib/linkedin/connection-poller.ts
  modified: []
decisions:
  - compileTemplate returns raw template on error (graceful fallback, console.warn)
  - evaluateSequenceRules is side-effect free — returns descriptors, caller enqueues
  - createSequenceRulesForCampaign is idempotent — deletes existing rules first (supports re-deploy)
  - MAX_RETRY_ATTEMPTS constant removed from poller — retry tracking uses DB query for sequenceStepRef='connection_retry', not a counter field
  - actionType cast to LinkedInActionType in processConnectionCheckResult — CampaignSequenceRule.actionType is string in Prisma, EnqueueActionParams requires the union type
  - getConnectionsToCheck excludes timed-out connections — those are handled by pollConnectionAccepts(), not the worker's live-check loop
metrics:
  duration_seconds: 4796
  completed_date: "2026-03-03"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 10 Plan 02: LinkedIn Sequencing Engine Summary

Handlebars template engine + CampaignSequenceRule evaluator + connection accept poller for LinkedIn cross-channel sequencing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install Handlebars and create sequencing engine | ea24c77 | src/lib/linkedin/sequencing.ts |
| 2 | Create connection accept poller | 0c1baba | src/lib/linkedin/connection-poller.ts |

## What Was Built

### sequencing.ts

Four exports implementing the sequencing engine:

**`compileTemplate(template, context)`** — Handlebars compile with `{ noEscape: true }`. LinkedIn messages are plain text; escaping would corrupt `&`, `<`, `>` characters in names. Gracefully returns raw template on compile error with console.warn.

**`buildTemplateContext(person, emailContext?)`** — Maps person fields to template variables (`firstName`, `lastName`, `companyName`, `jobTitle`, `linkedinUrl`) plus email event context (`emailStepRef`, `emailSubject`, `emailOpened`, `emailClicked`). All nullable fields default to empty string for safe Handlebars rendering.

**`evaluateSequenceRules(params)`** — Queries `CampaignSequenceRule` records matching `workspaceSlug + campaignName + triggerEvent`, optionally filtered by `triggerStepRef`. For each rule: checks `requireConnected` against `LinkedInConnection` status, compiles `messageTemplate` with Handlebars, returns an array of action descriptors. Caller is responsible for enqueuing — no side effects here.

**`createSequenceRulesForCampaign(params)`** — Idempotent batch create: deletes existing rules for the campaign first, then `createMany` from the `linkedinSequence` array. Derives `triggerEvent` (position 1 defaults to `delay_after_previous`, others to `email_sent`) and `requireConnected` (defaults true for `message` type).

### connection-poller.ts

Three exports for the Railway worker's connection polling loop:

**`pollConnectionAccepts(workspaceSlug)`** — Processes all pending connections for active+healthy senders. Detects 14-day timeout. On first timeout: checks 48h cooldown, then enqueues retry via `sequenceStepRef='connection_retry'`. On second timeout (retry already exists): marks connection `failed`, cancels all pending LinkedIn actions for the person.

**`processConnectionCheckResult(connectionId, newStatus)`** — Called after worker checks live status via VoyagerClient. On `connected`: updates DB, looks up campaign context via existing LinkedInActions, calls `evaluateSequenceRules` for `connection_accepted` trigger, enqueues follow-up actions. If original sender is unhealthy, reassigns to a healthy sender via `assignSenderForPerson`; logs warning and holds if none available. On `failed`: marks connection failed, cancels pending actions.

**`getConnectionsToCheck(workspaceSlug)`** — Returns pending connections (not timed out) with `personLinkedinUrl` included, for the worker to batch through VoyagerClient. Excludes timed-out connections — those are handled by `pollConnectionAccepts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type error: string not assignable to LinkedInActionType**
- **Found during:** Task 2 verification (`npx tsc --noEmit`)
- **Issue:** `CampaignSequenceRule.actionType` is typed as `string` in Prisma, but `EnqueueActionParams.actionType` expects the `LinkedInActionType` union. Direct assignment fails.
- **Fix:** Cast `descriptor.actionType as "connect" | "message" | "profile_view" | "check_connection"` at the `enqueueAction` call site.
- **Files modified:** `src/lib/linkedin/connection-poller.ts`
- **Commit:** 0c1baba (included in Task 2 commit)

**2. [Rule 1 - Cleanup] Removed unused MAX_RETRY_ATTEMPTS constant**
- **Found during:** IDE diagnostics after Task 2
- **Issue:** Constant declared but never read — retry logic uses a DB query for `sequenceStepRef='connection_retry'`, not a numeric counter.
- **Fix:** Removed the constant; added inline comment explaining the retry tracking approach.
- **Files modified:** `src/lib/linkedin/connection-poller.ts`
- **Commit:** 0c1baba (included in Task 2 commit)

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/lib/linkedin/sequencing.ts | FOUND |
| src/lib/linkedin/connection-poller.ts | FOUND |
| .planning/phases/10-auto-deploy-on-approval/10-02-SUMMARY.md | FOUND |
| commit ea24c77 (sequencing engine) | FOUND |
| commit 0c1baba (connection poller) | FOUND |
| `npx tsc --noEmit` | PASSED (0 errors) |
