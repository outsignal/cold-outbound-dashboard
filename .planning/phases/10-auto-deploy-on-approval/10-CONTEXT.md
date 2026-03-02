# Phase 10: Auto-Deploy + Email ↔ LinkedIn Sequencing - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

When admin triggers deploy on a dual-approved campaign, the system pushes leads + sequence content to EmailBison and/or LinkedIn sequencer as a fire-and-forget background job. Email and LinkedIn channels are interconnected via CampaignSequenceRules — LinkedIn actions trigger based on email events. Connection accept detection polls every 2 hours, auto-queuing follow-up steps. Deploy status, history, and notifications keep admin informed.

</domain>

<decisions>
## Implementation Decisions

### Deploy Trigger & Background Job
- Manual admin trigger via "Deploy Campaign" button (not auto on approval)
- Button on campaign detail page, only visible when both approvals are in and status isn't already deployed
- Confirmation modal before deploy: shows campaign name, lead count, channels, sequence step count
- Fire-and-forget Next.js API route (POST /api/campaigns/[id]/deploy) — returns immediately, runs async
- CampaignDeploy record tracks status: pending → running → complete / partial_failure / failed
- Partial failure supported: track which channel failed, admin can retry failed channel only
- Final status only (no real-time progress) — admin sees result on campaign detail page
- Deploy history table on campaign detail: timestamp, status, lead count, channels, error

### Email ↔ LinkedIn Sequencing Rules
- Both step-based and event-based triggers supported via `triggerType` field on CampaignSequenceRule
- Step-based (primary): "After Email Step X is sent, wait Y hours, then do LinkedIn Action Z"
- Event-based (optional): fire on EmailBison webhook events (EMAIL_SENT, EMAIL_OPENED, LINK_CLICKED)
- Full Handlebars-style template engine for LinkedIn messages: {{firstName}}, {{companyName}}, {{emailSubject}}, plus conditionals like {{#if emailOpened}}
- Auto-queue follow-up on connection accept — next LinkedIn step queued with configurable delay
- Up to 5 LinkedIn steps per sequence (to accommodate future action types like post likes/comments)

### Sequence Timing & Rate Limits
- Email steps: per-step `delayDays` field (e.g., Step 1 at day 0, Step 2 at day 3, Step 3 at day 7)
- LinkedIn steps: per-step `delayHours` field (e.g., connection request at deploy, follow-up 48h after accept)
- Per-sender daily cap for LinkedIn actions (e.g., 25 connection requests/day). Excess rolls to next day.
- Cross-channel: LinkedIn actions only fire after their linked email step is confirmed sent (email triggers LinkedIn)
- LinkedIn-only campaigns: actions queued with configurable delays between steps per lead (same gap model as email), NOT all-at-once

### Deploy Channels & Content Mapping
- Campaign has explicit `channels` field: ['email'], ['linkedin'], or ['email', 'linkedin']
- Deploy only pushes to selected channels
- Email content: 1:1 ordered mapping — Campaign.emailSequence[0] → EB Step 1, [1] → Step 2, etc.
- Dedup: Outsignal-side check first (skip leads already deployed) + EmailBison's own dedup as fallback
- Campaign.status === 'deployed' serves as deploy mutex

### Notifications & Error Handling
- Deploy success/failure: Slack notification to workspace channel + status visible on campaign detail page
- Notification includes summary: campaign name, lead count, email steps, LinkedIn steps, status
- EmailBison API down: retry 3x with exponential backoff, then mark as failed. Admin can manually retry.
- Daily cron includes proactive sender session refresh: flag sessions older than 6 days for re-auth (pairs with Phase 13)

### Connection Accept Detection
- Poll every 2 hours via Railway worker (not daily cron — faster follow-up response)
- On accept: auto-queue next LinkedIn step with configured delay
- If original sender is flagged (Phase 13): reassign follow-up to healthy sender if available; if no healthy sender, hold until one recovers
- Connection request timeout: if no accept after N days, auto-withdraw request, wait cooldown period, then retry once. Exact thresholds at Claude's discretion.
- Declined/withdrawn: mark lead as 'connection_failed', skip remaining LinkedIn steps for that lead

### Claude's Discretion
- Exact Handlebars template compilation approach
- CampaignSequenceRule schema design details
- Connection request timeout + cooldown day thresholds
- Exponential backoff timing for EB retry
- Railway worker polling implementation (interval mechanism)
- CampaignDeploy partial retry API design

</decisions>

<specifics>
## Specific Ideas

- Campaign detail page already exists from Phase 9 — add deploy button, deploy history table, and status to existing page
- Notification infra (Slack + email) exists in src/lib/notifications.ts — extend with deploy notification functions
- EmailBison client exists in src/lib/emailbison/client.ts — extend with campaign/sequence push methods
- LinkedIn worker on Railway already handles action queuing — extend with sequence-aware step scheduling
- Phase 13 health check integration: reuse same reassignment logic for follow-up sender assignment

</specifics>

<deferred>
## Deferred Ideas

- LinkedIn post likes and comments as action types — future action type enum values, not Phase 10 scope
- Auto-deploy on dual approval (originally planned) — user chose manual trigger instead; could revisit later

</deferred>

---

*Phase: 10-auto-deploy-on-approval*
*Context gathered: 2026-03-02*
