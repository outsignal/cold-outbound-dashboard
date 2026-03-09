# Phase 24: Campaign Analytics Engine - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Pre-compute campaign performance metrics via daily snapshots into CachedMetrics, enabling the admin to rank campaigns by performance, compare copy strategies, and analyze which sequence steps generate the most replies. Covers both email (EmailBison) and LinkedIn channels.

</domain>

<decisions>
## Implementation Decisions

### Metrics data source & snapshot
- **Email metrics** from EmailBison API (sent, opened, replied, bounced counts per campaign) — pulled daily
- **LinkedIn metrics** from local LinkedInAction records (connections sent, connections accepted, messages sent, profile views) — computed from DB
- **Classification-enriched metrics** from local Reply table (interested count, objection count, sentiment breakdown) — supplements raw counts from both channels
- **Snapshot frequency**: Daily via external cron (cron-job.org), one workspace per invocation (~every 10 min, cycling through 7 workspaces). Each run well within 30s timeout
- **Storage**: Daily history — one CachedMetrics row per campaign per day. Enables trend analysis and time-period comparisons for downstream phases

### Campaign rankings view
- Dedicated **`/admin/analytics`** page — separate from existing `/campaigns` management page
- **Workspace selector** dropdown (same pattern as replies page) — "All workspaces" default, plus individual workspace scoping
- **Table columns**: Campaign name, workspace, channel (email/linkedin/both), sent, reply rate, open rate, bounce rate, interested rate
- **Default sort**: Reply rate descending. All columns sortable
- **Time period filter**: 24h, 7d, 30d, All time chips — metrics computed from snapshots within selected period

### Per-step sequence analytics
- Shown as **expandable detail** when clicking a campaign row in the rankings table
- **Horizontal bar chart** — Step 1, Step 2, Step 3... as bars showing reply count/rate per step
- **Combined multi-channel view** with channel badge (email/LinkedIn) on each step — shows full sequence flow
- Each step shows: sent, replied, reply rate, plus **mini intent distribution** (interested %, objection %, etc.) from Phase 23 classification data

### Copy strategy comparison
- **Auto-detect strategy from email body content** using AI classification (not manual tagging)
- Detection runs **once at deploy time** — result stored on Campaign model. No ongoing AI cost
- **Strategies**: creative-ideas, PVP, one-liner, plus custom string for new approaches
- Presented as **grouped summary cards** on the analytics page — one card per strategy showing: # campaigns, avg reply rate, avg open rate, avg interested rate

### Claude's Discretion
- Auto-detection prompt design and classification approach for copy strategy
- Bar chart styling and color scheme for per-step analytics
- Summary card layout and visual design
- How to handle campaigns with zero or very few sends (minimum threshold for ranking)
- CachedMetrics key structure and schema design for daily snapshots

</decisions>

<specifics>
## Specific Ideas

- The analytics page should feel like a command center — the admin glances at it to know which campaigns are working and which aren't
- Per-step intent distribution should be compact (small colored segments, not full charts) — just enough to see "Step 3 gets the most interested replies"
- Strategy comparison cards should make it immediately obvious which approach wins (e.g., highlight the best-performing card)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-campaign-analytics-engine*
*Context gathered: 2026-03-09*
