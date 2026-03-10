# Phase 27: AI Insights & Action Queue - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate weekly AI-powered insights per workspace analyzing reply patterns, campaign performance, and cross-workspace comparisons. Admin can approve, dismiss, or defer each suggested action through a structured queue. Objection pattern clusters shown as a dedicated section with AI commentary. All views on a new "Insights" tab on the existing `/admin/analytics` page.

</domain>

<decisions>
## Implementation Decisions

### Insight generation scope
- **All analytics data feeds in** — CachedMetrics (campaign performance), Reply classifications (intent/sentiment/objections), benchmarks (vs global/industry), ICP calibration, copy performance, signal effectiveness
- **3-5 insights per workspace per week** — system picks the most actionable findings
- **Weekly cron + manual refresh** — external cron (cron-job.org) pre-generates insights weekly per workspace, plus a "Refresh insights" button for on-demand regeneration
- **Objection patterns: dedicated section + AI commentary** — always-on objection cluster distribution (e.g., "42% budget, 28% timing") as a dedicated section, plus AI-generated insights that interpret trends ("Budget objections spiked 3x in Rise this week")

### Action execution behavior
- **Auto-execute safe actions** — safe actions (update ICP threshold, flag for copy review, adjust signal targeting) execute automatically on approve. Destructive actions (pause campaign) show inline confirmation ("Confirm pause?" with cancel) before executing
- **4 action types**: pause campaign, update ICP threshold, flag for copy review, adjust signal targeting
- **Audit trail with before/after** — record who approved, when, what changed (e.g., "ICP threshold: 60 → 72"), and outcome. Stored on the Insight record. Viewable in action history
- **Inline confirmation for destructive actions** — button changes to "Confirm pause?" with cancel option, right on the card. No modal

### Insight card content & tone
- **Direct and data-first tone** — lead with the number/finding: "Rise reply rate dropped 40% this week. Step 3 objection rate spiked from 12% to 38%." No fluff
- **High/Medium/Low confidence badge** — color-coded: green High, yellow Medium, gray Low. Based on data volume and statistical significance
- **Numbers with trend arrows** — key metrics with ↑/↓ arrows and percentage change: "Reply rate: 2.1% ↓ (-40% vs last week)"
- **Category badge + color accent** — each card has a category badge (Performance, Copy, Objections, ICP) with subtle left-border color for scanning

### Queue management & lifecycle
- **Preset snooze durations** — 3 options: 3 days, 1 week, 2 weeks. Card disappears from active queue and reappears after snooze period
- **Dismissed: hidden but viewable** — dismissed insights move to a collapsed "Dismissed" section. System won't regenerate the same insight within the dedup window
- **Recurrence with 2-week dedup window** — same insight type can recur after 2 weeks, but not if the exact finding was dismissed within that window
- **"Insights" tab on analytics page** — 4th tab alongside Performance, Copy, Benchmarks. All intelligence on one page

### Claude's Discretion
- AI prompt design for insight generation (what analysis to run, how to prioritize findings)
- Confidence level thresholds (what makes High vs Medium vs Low)
- Category color accent choices
- Insight deduplication algorithm (how to detect "same insight")
- Cron scheduling pattern (weekly timing, workspace rotation)
- Data model design for Insight records (fields, relations)

</decisions>

<specifics>
## Specific Ideas

- The insight cards should feel like a smart analyst's weekly briefing — "here's what happened, here's what I'd do about it"
- Objection cluster section is the most unique feature — showing "42% budget, 28% timing" across campaigns helps the admin spot systemic copy issues
- The approve/dismiss/defer flow should be fast — one click for most actions, two clicks for destructive ones

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-ai-insights-action-queue*
*Context gathered: 2026-03-10*
