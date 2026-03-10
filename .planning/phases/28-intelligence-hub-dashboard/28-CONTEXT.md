# Phase 28: Intelligence Hub Dashboard - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

A dedicated Intelligence Hub page at `/admin/intelligence` that aggregates all intelligence data — campaign rankings, reply classification breakdowns, cross-workspace benchmarks, ICP calibration, and active insights — into one unified executive summary view. Each section shows summarized data with drill-down links to the existing analytics page tabs for full detail. Enhanced weekly digest notification with hub-specific KPIs.

</domain>

<decisions>
## Implementation Decisions

### Hub vs analytics page relationship
- **New standalone page** at `/admin/intelligence` — the existing `/admin/analytics` page with its 4 tabs (Performance, Copy, Benchmarks, Insights) remains unchanged
- **Top-level sidebar item** — "Intelligence" as its own sidebar link alongside Dashboard, Workspaces, Analytics, etc.
- **Global by default** — hub loads with all-workspace aggregate data, with a workspace filter dropdown to drill into one workspace
- **Links to analytics tabs** — hub shows summaries, each section has a "View details" link that opens the relevant analytics tab

### Dashboard layout and information hierarchy
- **Bento grid layout** — mixed-size cards in a grid, key data gets larger cards, secondary items smaller
- **Active insights + Campaign rankings get hero treatment** — largest/most prominent cards in the grid (most actionable data first)
- **KPI row at top** — 4-6 headline stat cards above the bento grid (total replies this week, avg reply rate, active insights count, top-performing workspace, etc.)
- **Time period filter** — dropdown for 7d / 30d / all time. KPI row and campaign data respond to the filter. Benchmarks stay all-time per Phase 26 decision.

### Data density and drill-down behavior
- **Campaign rankings: top 5 with key metrics** — show top 5 campaigns by reply rate with 2-3 metrics each, plus "View all" link to analytics Performance tab
- **Reply classifications: donut charts** — small donut/pie charts for intent distribution and sentiment breakdown, compact and visual, link to analytics for full data
- **Insights: count + top 2-3 insights** — show "5 active insights" with the 2-3 highest confidence ones previewed (condensed cards), plus "View all" to Insights tab
- **Benchmarks & ICP: mini gauges + recommendation** — small gauge bars for 2-3 key metrics plus ICP threshold recommendation card, link to Benchmarks tab for full view

### Weekly digest enhancement
- **Enhance existing digest with hub summary** — add KPI summary (reply count, top campaign, insight count) to the existing notifyWeeklyDigest, with a CTA link to the hub page
- **Hub page as primary CTA** — weekly digest links to `/admin/intelligence`
- **Per-workspace highlights** — each workspace gets a brief section: top campaign, reply count, any active insights
- **Data-first tone** — match insight cards style: "Rise: 12 replies, 2.1% reply rate (up from 1.8%). 3 insights pending."

### Claude's Discretion
- Bento grid card sizing and responsive breakpoints
- KPI stat card selection (which 4-6 metrics to highlight)
- Donut chart color palette and sizing
- Mini gauge implementation details
- Empty state design for sections with no data
- Exact digest enhancement format (Slack blocks vs email HTML)

</decisions>

<specifics>
## Specific Ideas

- The hub should feel like an executive briefing — glance at it and know what needs attention across all workspaces
- Insights and campaign rankings are the most actionable sections — they tell the admin what to do next
- Each bento card should have a clear "View details" affordance linking to the right analytics tab
- The KPI row should answer "how are things going?" in 2 seconds

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-intelligence-hub-dashboard*
*Context gathered: 2026-03-10*
