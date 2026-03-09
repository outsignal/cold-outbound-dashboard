# Phase 23: Reply Storage & Classification - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Every reply that enters the system (via webhook or poll-replies cron) is persisted with full body text and automatically classified by intent (9 categories), sentiment (3 levels), and objection subtype (6 types). Admin can view, filter, and override classifications. Classification breakdown charts on the replies page.

</domain>

<decisions>
## Implementation Decisions

### Reply visibility
- Dedicated `/admin/replies` page with filterable list of all replies across workspaces
- Default view: all replies, newest first, with filters at top (workspace dropdown, intent filter chips, sentiment filter, date range)
- Also inline as a tab on campaign detail page, scoped to that campaign
- Each reply row shows: sender name/email, subject line, intent badge, sentiment badge, workspace tag, timestamp, first ~100 chars of body preview (dense layout)
- Click a row → side panel slides out showing full body, all classification details, linked campaign, person info, link to reply in EmailBison inbox
- Summary stats + mini charts at top of replies page (intent distribution, sentiment bar, counts by workspace)
- Detailed classification breakdown charts also on Intelligence Hub (Phase 28)

### Classification UX
- Admin can override a classification by clicking the intent badge → dropdown to reclassify
- Store both original AI classification and admin override: `originalIntent`, `overrideIntent`, `overriddenAt`, `overriddenBy`
- This creates an accuracy tracking dataset for improving prompts over time

### Data capture scope
- Store reply body as **plain text only** (strip HTML). Link to EmailBison inbox for full formatted view
- Capture `sequenceStep` number from EmailBison webhook payload (critical for Phase 24 per-step analytics)
- Snapshot the **outbound email** that triggered the reply: store subject + body alongside the reply. Self-contained record for copy analysis (Phase 25) without cross-referencing campaign sequences
- Store a 1-line **LLM-generated summary** explaining the classification reasoning (e.g., "Uses competing solution Lemlist, not interested in switching")

### Webhook integration
- Classify **inline** in the webhook handler — Haiku is ~200ms, webhook has maxDuration=60. Reply is classified by the time notification fires
- Classification runs **before** `generateReplySuggestion()` — classification context feeds into better reply suggestions
- **Store reply first, then classify.** If classification fails (API error, timeout), the reply is never lost
- Failed classifications stored with `intent=null`. A periodic retry cron picks up unclassified replies and retries until classification succeeds
- **Poll-replies cron** uses the same classification flow — any reply caught by the fallback also gets classified

### Claude's Discretion
- Visual style of intent and sentiment badges (color-coded pills, icons, etc.)
- Side panel layout and styling
- Chart types for classification breakdown (pie, bar, donut, etc.)
- Classification retry cron frequency and backoff strategy
- How to handle edge cases: multi-intent replies, very short replies, non-English text

</decisions>

<specifics>
## Specific Ideas

- Link to "Reply in Outsignal" (https://app.outsignal.ai/inbox) in the side panel detail view
- The classification summary should be concise — one line explaining the reasoning, not a paragraph
- Sequence step capture must be investigated — verify that EmailBison webhook payload includes this field

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-reply-storage-classification*
*Context gathered: 2026-03-09*
