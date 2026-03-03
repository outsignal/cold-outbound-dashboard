---
phase: 10-auto-deploy-on-approval
verified: 2026-03-03T00:00:00Z
status: gaps_found
score: 9/12 must-haves verified
gaps:
  - truth: "Deploy operations layer seeds CampaignSequenceRules in DB at deploy time for LinkedIn channel"
    status: failed
    reason: "createSequenceRulesForCampaign is defined in sequencing.ts but never called from deploy.ts or any other execution path. Without this call, no CampaignSequenceRule records are ever written to the DB for a campaign's LinkedIn sequence steps. The EMAIL_SENT webhook calls evaluateSequenceRules(), which queries the DB — but finds nothing. Cross-channel sequencing is silently broken."
    artifacts:
      - path: "src/lib/campaigns/deploy.ts"
        issue: "deployLinkedInChannel and executeDeploy do not import or call createSequenceRulesForCampaign from sequencing.ts"
      - path: "src/lib/linkedin/sequencing.ts"
        issue: "createSequenceRulesForCampaign is exported but is an orphan — never imported from any execution path"
    missing:
      - "Add import { createSequenceRulesForCampaign } from '@/lib/linkedin/sequencing' to deploy.ts"
      - "Call createSequenceRulesForCampaign({ workspaceSlug, campaignName, linkedinSequence }) inside deployLinkedInChannel (or executeDeploy before LinkedIn channel runs)"
  - truth: "EMAIL_SENT webhook triggers LinkedIn sequence rules with populated CampaignSequenceRule data"
    status: partial
    reason: "The webhook handler correctly calls evaluateSequenceRules() and the query logic is sound. However, because createSequenceRulesForCampaign is never called at deploy time (see gap above), the CampaignSequenceRule table will be empty for any deployed campaign. evaluateSequenceRules returns [] every time. This makes SEQ-01 and SEQ-02 non-functional in practice despite correct wiring code."
    artifacts:
      - path: "src/app/api/webhooks/emailbison/route.ts"
        issue: "Correctly calls evaluateSequenceRules() but no rules will ever be found because they are never seeded"
    missing:
      - "Fix the root cause: call createSequenceRulesForCampaign at deploy time (see gap above)"
  - truth: "DEPLOY-02: On dual approval, auto-deploy triggers without admin intervention"
    status: partial
    reason: "The CONTEXT.md explicitly documents this was changed to a manual button trigger by user decision ('Auto-deploy on dual approval (originally planned) — user chose manual trigger instead'). The requirement wording in REQUIREMENTS.md does not match the implemented behavior. The approval routes (approve-leads/route.ts, approve-content/route.ts) do not call executeDeploy. This is a documented design decision, not an implementation bug, but the requirement text is technically unmet."
    artifacts:
      - path: "src/app/api/portal/campaigns/[id]/approve-leads/route.ts"
        issue: "Calls notifyApproval on both_approved but does not call executeDeploy"
      - path: "src/app/api/portal/campaigns/[id]/approve-content/route.ts"
        issue: "Calls notifyApproval on both_approved but does not call executeDeploy"
    missing:
      - "Either: update REQUIREMENTS.md to reflect the documented design change (manual trigger is now the contract), OR implement auto-deploy in approval routes"
human_verification:
  - test: "Open a campaign with status=approved and both leadsApproved=true and contentApproved=true. Verify the Deploy Campaign button appears in the header."
    expected: "Yellow Deploy Campaign button with rocket icon visible in header area. Button absent when status != approved."
    why_human: "Conditional rendering depends on runtime props — cannot verify from static analysis alone."
  - test: "Click Deploy Campaign button, verify confirmation modal appears with correct campaign name, lead count, channels, and step counts."
    expected: "Modal shows accurate stats grid matching campaign data. Warning text and Deploy Now / Cancel buttons present."
    why_human: "UI state and prop propagation requires browser interaction."
  - test: "Trigger a deploy and check the Deploy History section on the campaign detail page."
    expected: "Table renders rows with timestamp, status badge (color-coded), channels, lead count, step counts, and any error. Retry buttons appear for partial_failure/failed rows."
    why_human: "Dynamic fetch on mount — requires live deployment with actual CampaignDeploy records."
  - test: "Verify Slack deploy notification arrives when a deploy completes."
    expected: "Slack message in workspace channel with campaign name, status emoji, lead count, email/LinkedIn step counts, and a View Campaign button."
    why_human: "External service integration — cannot verify without live Slack workspace and real deploy."
---

# Phase 10: Auto-Deploy on Approval Verification Report

**Phase Goal:** When admin triggers deploy on a dual-approved campaign, the system auto-deploys to EmailBison (campaign + sequence steps + leads) and LinkedIn sequencer (connection requests + follow-ups) as a fire-and-forget background job, with deploy status visible to admin. Email and LinkedIn channels are interconnected — LinkedIn actions trigger based on email events (EMAIL_SENT steps 1/2/3), and LinkedIn content adapts based on which email step fired.

**Verified:** 2026-03-03
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | CampaignDeploy model tracks deploy status (pending, running, complete, partial_failure, failed) with per-channel error fields | VERIFIED | `prisma/schema.prisma` lines 453-491: all required fields present including emailStatus, linkedinStatus, emailError, linkedinError, error, channels, retryChannel |
| 2 | EmailBisonClient can create sequence steps via POST /campaigns/{id}/sequence-steps | VERIFIED | `src/lib/emailbison/client.ts`: createSequenceStep method exists using request() pattern with CreateSequenceStepParams |
| 3 | Deploy operations layer pushes email content + leads to EmailBison with retry logic | VERIFIED | `src/lib/campaigns/deploy.ts`: deployEmailChannel function with withRetry(3x, 1s/5s/15s), createCampaign, createSequenceStep per step, createLead per lead with dedup |
| 4 | Deploy operations layer handles email-only, linkedin-only, and both channel modes | VERIFIED | executeDeploy() checks hasEmail/hasLinkedIn flags and routes to deployEmailChannel/deployLinkedInChannel independently |
| 5 | Dedup prevents re-pushing leads already deployed | VERIFIED | WebhookEvent check: `prisma.webhookEvent.findFirst({ where: { workspace, eventType: 'EMAIL_SENT', leadEmail } })` — skips if found |
| 6 | Deploy is fire-and-forget — returns immediately, runs async | VERIFIED | deploy/route.ts uses `after()` from next/server; returns NextResponse immediately before executeDeploy runs |
| 7 | Campaign.status=deployed prevents double-deploy (mutex) | VERIFIED | route.ts transitions status to 'deployed' before calling after(); executeDeploy validates `campaign.status !== 'deployed'` before proceeding |
| 8 | EMAIL_SENT webhook triggers LinkedIn sequence rule evaluation | PARTIAL | webhook/route.ts correctly calls evaluateSequenceRules() and enqueueAction() — but createSequenceRulesForCampaign is never called at deploy time, so the rules table is always empty. Wiring correct; data missing. |
| 9 | Handlebars template engine compiles LinkedIn message templates | VERIFIED | `src/lib/linkedin/sequencing.ts`: Handlebars.compile with noEscape:true, buildTemplateContext with all required fields (firstName, lastName, companyName, jobTitle, emailSubject, emailOpened, etc.) |
| 10 | CampaignSequenceRule seeds created at deploy time for LinkedIn channel | FAILED | createSequenceRulesForCampaign() is defined in sequencing.ts but is never imported or called from deploy.ts or any other execution path |
| 11 | Connection accept poller handles timeouts, retries, and failed connections | VERIFIED | connection-poller.ts: 14-day timeout, 48h cooldown, single retry, cancel pending actions on failure, evaluateSequenceRules on accept |
| 12 | Admin sees deploy status and history on campaign detail page | VERIFIED | Campaign detail page imports DeployButton and DeployHistory; history table with status badges, retry buttons, error truncation with tooltip |

**Score: 9/12 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | CampaignDeploy model added | VERIFIED | All fields present: status, emailStatus, linkedinStatus, leadCount, emailStepCount, linkedinStepCount, emailBisonCampaignId, emailError, linkedinError, error, channels, retryChannel, completedAt |
| `src/lib/campaigns/deploy.ts` | executeDeploy, retryDeployChannel, getDeployHistory | VERIFIED | All three exports present; 575 lines, substantive implementation with retry, dedup, per-channel error handling |
| `src/lib/emailbison/client.ts` | createSequenceStep method added | VERIFIED | Method exists, follows existing request() pattern, returns SequenceStep |
| `src/lib/linkedin/sequencing.ts` | compileTemplate, buildTemplateContext, evaluateSequenceRules, createSequenceRulesForCampaign | VERIFIED (exists) / ORPHANED (createSequenceRulesForCampaign) | All exports exist and are substantive; createSequenceRulesForCampaign is never called |
| `src/lib/linkedin/connection-poller.ts` | pollConnectionAccepts, processConnectionCheckResult, getConnectionsToCheck | VERIFIED | All three exports present; 309 lines, substantive implementation |
| `src/app/api/campaigns/[id]/deploy/route.ts` | POST with status validation, fire-and-forget, retry support | VERIFIED | Uses after(), validates status=approved, checks both approvals, creates CampaignDeploy, transitions to deployed |
| `src/app/api/campaigns/[id]/deploys/route.ts` | GET returning deploy history | VERIFIED | Calls getDeployHistory(), returns { deploys } |
| `src/app/api/webhooks/emailbison/route.ts` | EMAIL_SENT triggers LinkedIn sequence rules | PARTIAL | Wiring is correct; data will be empty at runtime (no rules seeded) |
| `src/lib/notifications.ts` | notifyDeploy function | VERIFIED | Lines 464-end: full Slack + email implementation with status colors, lead count, step counts, error, View Campaign button |
| `src/app/api/cron/session-refresh/route.ts` | Flags senders with sessions older than 6 days | VERIFIED | Queries Sender where sessionStatus=active and updatedAt < 6 days ago, sets session_expired, creates SenderHealthEvent |
| `src/app/(admin)/campaigns/[id]/DeployButton.tsx` | Conditional button, confirmation modal, POST to deploy API | VERIFIED | client component, renders null when not approved, modal with stats grid, handleDeploy calls /api/campaigns/{id}/deploy |
| `src/app/(admin)/campaigns/[id]/DeployHistory.tsx` | Deploy history table with retry buttons | VERIFIED | useEffect fetch on mount, StatusBadge color map, RetryButton for failed channels, ErrorCell with truncation+tooltip |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| deploy/route.ts | executeDeploy (deploy.ts) | after() import | WIRED | `after(async () => { await executeDeploy(id, deploy.id); })` at line 85 |
| deploy/route.ts | retryDeployChannel (deploy.ts) | after() on retry | WIRED | `after(async () => { await retryDeployChannel(latestDeploy.id, retryChannel); })` at line 43 |
| deploys/route.ts | getDeployHistory (deploy.ts) | direct import | WIRED | `import { getDeployHistory } from "@/lib/campaigns/deploy"` |
| webhook/route.ts | evaluateSequenceRules (sequencing.ts) | import at line 7 | WIRED | Import present, called at line 114 for EMAIL_SENT events |
| webhook/route.ts | enqueueAction (linkedin/queue) | import at line 5 | WIRED | Imported and called inside the EMAIL_SENT LinkedIn block at line 146 |
| connection-poller.ts | evaluateSequenceRules (sequencing.ts) | import | WIRED | Called in processConnectionCheckResult for connection_accepted trigger |
| deploy.ts | notifyDeploy (notifications.ts) | import at line 19 | WIRED | Called at end of executeDeploy, non-blocking with .catch() |
| deploy.ts | createSequenceRulesForCampaign (sequencing.ts) | NOT WIRED | NOT WIRED | Function exists in sequencing.ts but is not imported or called from deploy.ts. LinkedIn sequence rules are never seeded. |
| DeployButton.tsx | POST /api/campaigns/[id]/deploy | fetch() | WIRED | fetch call at line 45 with method: "POST" |
| DeployHistory.tsx | GET /api/campaigns/[id]/deploys | fetch() | WIRED | fetch call at line 116 in fetchHistory() |
| Campaign detail page | DeployButton | import | WIRED | `import { DeployButton } from "./DeployButton"` at line 5 |
| Campaign detail page | DeployHistory | import | WIRED | `import { DeployHistory } from "./DeployHistory"` at line 6 |
| vercel.json | /api/cron/session-refresh | cron schedule | WIRED | Entry present: `{ "path": "/api/cron/session-refresh", "schedule": "0 6 * * *" }` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| DEPLOY-02 | 10-03 | On dual approval, auto-deploy triggers without admin intervention | PARTIAL | Design deliberately changed to manual button (documented in 10-CONTEXT.md deferred section). Both approval routes transition status to 'approved' but do not call executeDeploy. Admin must click Deploy Campaign button. Requirement text is technically unmet but this matches documented user intent. |
| DEPLOY-03 | 10-01 | System creates EmailBison campaign with sequence steps from approved email content | VERIFIED | deployEmailChannel() calls ebClient.createCampaign() then loops emailSequence calling createSequenceStep() per step with withRetry |
| DEPLOY-04 | 10-01 | System pushes verified leads to EmailBison workspace | VERIFIED | deployEmailChannel() loads TargetListPerson, dedup checks WebhookEvent, calls ebClient.createLead() with 100ms throttle |
| DEPLOY-05 | 10-01 | System queues LinkedIn messages via LinkedIn sequencer worker on Railway | VERIFIED | deployLinkedInChannel() calls enqueueAction() for first step with 15-min stagger per lead |
| DEPLOY-06 | 10-01, 10-03, 10-04 | Deploy is fire-and-forget with CampaignDeploy record tracking status | VERIFIED | after() from next/server used in route; CampaignDeploy model has full status lifecycle; notifyDeploy called on completion |
| DEPLOY-07 | 10-01 | Deploy handles email-only, LinkedIn-only, or both channels | VERIFIED | hasEmail/hasLinkedIn flags drive which channel functions run; skipped channels get explicit 'skipped' status |
| SEQ-01 | 10-02, 10-03 | EMAIL_SENT webhook triggers LinkedIn actions via CampaignSequenceRule | PARTIAL | Wiring exists (webhook evaluates rules and enqueues actions) but createSequenceRulesForCampaign is never called at deploy time, so the rules table is always empty. Functionally broken. |
| SEQ-02 | 10-02 | CampaignSequenceRule maps email steps to LinkedIn actions with correct fields | PARTIAL | Schema exists with all required fields (triggerEvent, triggerStepRef, actionType, messageTemplate, delayMinutes). createSequenceRulesForCampaign correctly maps linkedinSequence to DB records. But it's never called. |
| SEQ-03 | 10-02 | Connection accept detection polls periodically, next step auto-queues | VERIFIED | pollConnectionAccepts() handles timeout/retry logic; processConnectionCheckResult() calls evaluateSequenceRules on connected and enqueues follow-up actions |
| SEQ-04 | 10-02 | LinkedIn message templates can reference email step context | VERIFIED | buildTemplateContext() maps emailStepRef, emailSubject, emailOpened, emailClicked; compileTemplate() uses Handlebars with noEscape; evaluateSequenceRules passes emailContext through |
| SEQ-05 | 10-04 | Sender session refresh runs on daily cron, re-auths sessions older than 6 days | VERIFIED | session-refresh/route.ts flags sessions older than 6 days; vercel.json has cron at 0 6 * * * |

**Note:** NOTIF-03 appears in plan 04's requirements list. NOTIF-03 = "Admin receives notification when deploy completes or fails" — VERIFIED via notifyDeploy in notifications.ts called from executeDeploy.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/linkedin/sequencing.ts` | 188 | createSequenceRulesForCampaign defined but never called from any execution path | Blocker | LinkedIn sequence rules are never seeded at deploy time. evaluateSequenceRules() in webhook always returns []. Cross-channel sequencing (SEQ-01, SEQ-02) is non-functional. |
| `src/app/api/portal/campaigns/[id]/approve-leads/route.ts` | 31 | DEPLOY-02: both_approved case sends notification but does not trigger deploy | Warning | DEPLOY-02 requirement says auto-deploy; CONTEXT.md says this is intentional. Requirement text unmet but design change is documented. |

---

### Human Verification Required

#### 1. Deploy Campaign Button Conditional Rendering

**Test:** Open campaign detail page for a campaign with status=approved, leadsApproved=true, contentApproved=true. Also check a campaign with status=draft.
**Expected:** Button visible only for the approved campaign. Absent (returns null) for draft.
**Why human:** Conditional rendering requires runtime prop values and browser rendering.

#### 2. Confirmation Modal Accuracy

**Test:** Click Deploy Campaign button on an approved campaign with known lead count and sequence steps.
**Expected:** Modal shows correct campaignName, leadCount, channels, emailStepCount, linkedinStepCount. Warning text and Deploy Now / Cancel buttons present. Close modal by clicking overlay or Cancel.
**Why human:** UI state and data propagation requires browser interaction with live data.

#### 3. Deploy History Table

**Test:** After triggering a deploy, refresh campaign detail page and check Deploy History section.
**Expected:** Table shows the deploy row with timestamp, colored status badge (green/amber/red), channels badges, lead count, step counts. Retry Email/LinkedIn buttons appear for partial/failed rows.
**Why human:** Requires live CampaignDeploy records from a real deploy.

#### 4. Slack Notification on Deploy Completion

**Test:** Complete a deploy and check the workspace's Slack channel.
**Expected:** Message with campaign name, status emoji, lead count, email/LinkedIn steps, and "View Campaign" button linking to admin dashboard.
**Why human:** External service integration — requires live Slack workspace and real deploy.

---

### Gaps Summary

**Two linked gaps blocking cross-channel sequencing (SEQ-01, SEQ-02):**

The `createSequenceRulesForCampaign` function was correctly designed and implemented in `src/lib/linkedin/sequencing.ts`. It converts a campaign's `linkedinSequence` array into `CampaignSequenceRule` database records, which the EMAIL_SENT webhook later queries via `evaluateSequenceRules()`. The entire cross-channel bridge depends on these records existing.

However, `createSequenceRulesForCampaign` is never called from `deploy.ts` (or anywhere else). The function is an orphan. At deploy time, no `CampaignSequenceRule` records are written. When the EMAIL_SENT webhook fires and calls `evaluateSequenceRules()`, it queries an empty table and returns `[]`. No LinkedIn actions are ever enqueued in response to email sends. The cross-channel sequencing that is the primary differentiator of this phase is silently non-functional.

**Fix is straightforward:** Import `createSequenceRulesForCampaign` in `deploy.ts` and call it inside `deployLinkedInChannel` (or `executeDeploy` before the LinkedIn channel runs) with the campaign's `linkedinSequence`.

**One requirement text mismatch (DEPLOY-02):**

The REQUIREMENTS.md states "auto-deploy triggers without admin intervention" but the CONTEXT.md documents this was deliberately changed to a manual Deploy Campaign button at the user's request. The approval routes are correctly implemented for the manual trigger design. This is not an implementation bug — it is an undocumented requirement evolution. The REQUIREMENTS.md should be updated to reflect the actual design, or the CONTEXT.md deferred note should serve as the canonical record of the design change.

---

*Verified: 2026-03-03*
*Verifier: Claude (gsd-verifier)*
