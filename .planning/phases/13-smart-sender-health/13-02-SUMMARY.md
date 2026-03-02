---
phase: 13-smart-sender-health
plan: 02
subsystem: notifications
tags: [notifications, slack, email, sender-health, cron, digest]
dependency_graph:
  requires:
    - 13-01 (runSenderHealthCheck() detection engine + HealthCheckResult interface)
  provides:
    - notifySenderHealth() exported from src/lib/notifications.ts
    - sendSenderHealthDigest() exported from src/lib/notifications.ts
    - Cron pipeline wired for immediate critical alerts + daily warning digest
  affects:
    - src/app/api/inbox-health/check/route.ts (response shape changed: healthChecked/healthCritical/healthWarnings added)
tech_stack:
  added: []
  patterns:
    - Block-kit Slack notifications with header + section + actions blocks
    - Branded email HTML template with severity-colored header and CTA button
    - Grouped digest pattern: collect all warnings, send one message per workspace
key_files:
  created: []
  modified:
    - src/lib/notifications.ts
    - src/app/api/inbox-health/check/route.ts
decisions:
  - notifySenderHealth() uses workspace.slackChannelId (client channel) for both critical and warning Slack alerts - same channel as reply notifications; ops channel gets coverage via notify() DB+Slack call
  - Email only for critical severity - warning-level bounce rate alerts are low urgency, Slack digest sufficient per CONTEXT.md
  - sendSenderHealthDigest() groups by workspaceSlug before sending - one Slack message per workspace regardless of how many senders have warnings
  - verifySlackChannel guard returns (not just logs) on failure for notifySenderHealth, but uses continue for sendSenderHealthDigest loop to not abort other workspaces
metrics:
  duration_minutes: 5
  completed_date: "2026-03-02"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  files_created: 0
---

# Phase 13 Plan 02: Sender Health Notifications Summary

**One-liner:** Slack + email critical alerts and daily warning digest for flagged senders, extending existing notification patterns with block-kit messages and branded HTML email templates.

## What Was Built

### Task 1: notifySenderHealth() and sendSenderHealthDigest() in notifications.ts

Added two exported functions following the exact pattern of existing `notifyApproval()` and `notifyReply()`:

**`notifySenderHealth()`** — critical and warning immediate alerts:
- Fetches workspace by slug; returns early if not found
- Sends block-kit Slack to `workspace.slackChannelId` with: header (alert vs warning text), sender name, reason (human-readable label map), detail, optional reassigned count section, optional workspace-paused warning section, "View Senders" action button
- For critical severity only: sends branded HTML email to `workspace.notificationEmails` with red (#dc2626) severity header, sender details card (sender name / reason / detail), workspace-paused red alert box (conditional), reassignment info line (conditional), brand-colored (#F0FF7A) CTA button
- Guards: `verifySlackChannel` + `verifyEmailRecipients` matching existing patterns

**`sendSenderHealthDigest()`** — daily warning batch (Slack only):
- Groups incoming warnings array by `workspaceSlug`
- For each workspace group: fetches workspace, skips if no `slackChannelId`, posts single block-kit message with all warning lines as bullet list
- Each workspace wrapped in independent try/catch — one failure doesn't block others

### Task 2: Cron pipeline wiring in check/route.ts

Updated `src/app/api/inbox-health/check/route.ts`:
- Added `notifySenderHealth` and `sendSenderHealthDigest` to imports
- Replaced `// Notification handling will be wired in Plan 02` placeholder with full pipeline:
  - Critical results: `notifySenderHealth()` (immediate Slack + email) + `notify()` (DB + ops Slack)
  - Warning results: collected into `warningsForDigest[]`
- After loop: `sendSenderHealthDigest({ warnings: warningsForDigest })` if any warnings
- Response JSON updated: `senderHealthChanges` replaced with `healthChecked`, `healthCritical`, `healthWarnings`
- Console log: `[timestamp] Sender health check complete: N result(s) (X critical, Y warnings)`

## Verification

1. `npx tsc --noEmit` passes — no type errors
2. `notifySenderHealth` and `sendSenderHealthDigest` exported from notifications.ts (lines 707, 923)
3. Cron route imports both functions (line 4) and calls them in the health result loop (lines 91, 132)
4. Critical alerts: `notifySenderHealth()` fires Slack + email; `notify()` writes DB + ops Slack
5. Warning alerts collected into digest array, sent as single Slack message per workspace after loop
6. All notification calls wrapped in try/catch — cron continues on notification failure
7. Response includes `healthChecked`, `healthCritical`, `healthWarnings` counts

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 5af39f9 | feat(13-02): add notifySenderHealth() and sendSenderHealthDigest() to notifications.ts |
| d2f6ecf | feat(13-02): wire sender health notifications and digest into cron pipeline |

## Self-Check: PASSED
