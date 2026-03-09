# Phase 25: Copy Performance Analysis - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Analyze subject lines and email body structural elements to surface what copy patterns drive the highest reply rates. Admin can see ranked subject lines, element-to-reply-rate correlations (with workspace/vertical filtering), and top-performing email templates with element breakdowns. All analysis data is filterable by workspace and vertical.

</domain>

<decisions>
## Implementation Decisions

### Subject line ranking
- **Both global and per-campaign views** — toggle between global ranking across all campaigns and per-campaign groupings
- **Metrics per subject line**: open rate, reply rate, total sends (volume for confidence)
- **Location**: "Copy" tab on existing `/admin/analytics` page — keeps all analytics together
- **Minimum 10 sends** to include in rankings — prevents noise from one-off tests

### Body element tagging
- **AI classification at snapshot time** — classify body elements during the daily snapshot cron, same pattern as copy strategy detection
- **Per email step** granularity — each step in a sequence gets its own element tags (Step 1 might have `problem_statement + personalization`, Step 3 might have `case_study + CTA`)
- **Fixed 6 element types**: CTA type, problem statement, value proposition, case study, social proof, personalization
- **CTA subtypes** classified additionally: `book_a_call`, `reply_to_email`, `visit_link`, `download_resource` — knowing which CTA type drives replies is actionable

### Correlation & insights display
- **Multiplier cards** — one card per element showing "2.1x more replies" or "0.5x fewer replies" vs baseline. Immediately actionable
- **Dual baselines** — show global multiplier AND vertical-specific multiplier side by side (e.g., "Case studies: 2.1x globally, 4.0x in recruitment, 0.5x in merchandise")
- **Vertical source**: use workspace's existing `vertical` field — no new tagging needed
- **Confidence indicators** — show sample size (e.g., "based on 45 emails") and dim/flag low-confidence correlations (< 20 samples)

### Top templates view
- **Ranking criteria**: weighted by both reply rate AND interested rate — high reply rate with low interested rate means objections, not conversions. Minimum 10 sends threshold
- **Top 10 templates** shown, filterable by workspace and vertical (same filters as correlation view)
- **Detail view**: full email body text alongside tagged structural element pills — admin sees exactly what worked
- Filters reuse workspace + vertical from the correlation view

### Claude's Discretion
- Multiplier card visual design and color coding (green for positive, red for negative)
- AI classification prompt design for body elements
- Composite ranking formula for top templates (how to weight reply rate vs interested rate)
- Tab layout and switching behavior on the analytics page
- How to handle emails with no classifiable elements

</decisions>

<specifics>
## Specific Ideas

- The dual-baseline insight is the killer feature — "case studies get 4x in recruitment but 0.5x in merchandise" is exactly the kind of data-driven copy decision this phase enables
- Top templates should make it obvious WHY they performed well by visually connecting the element tags to the performance metrics
- Low-confidence correlations should be visually distinct (dimmed, not hidden) — admin can still see emerging patterns

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-copy-performance-analysis*
*Context gathered: 2026-03-09*
