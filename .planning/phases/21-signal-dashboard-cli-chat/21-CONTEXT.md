# Phase 21: Signal Dashboard + CLI Chat - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Two features: (1) An `/admin/signals` dashboard page showing a live signal feed, per-client breakdown, cost tracking, and signal type distribution. (2) An interactive CLI chat (`npm run chat`) that runs the full orchestrator from the terminal for rapid campaign work without opening the browser.

</domain>

<decisions>
## Implementation Decisions

### Signal Feed Layout
- Table rows (not cards or timeline) — dense, sortable, filterable
- Columns: time, company, signal type, workspace
- Color-coded badges/pills per signal type (funding, job_change, hiring_spike, tech_adoption, news, social_mention)
- Combined view showing all workspaces by default, with a dropdown filter to narrow to one workspace
- Auto-refresh via polling every 30 seconds, with "Last updated: X" timestamp display

### Cost & Analytics Views
- Top row of summary cards: total daily cost, total weekly cost, total signals
- Per-workspace breakdown table below summary cards
- One bar chart showing signal type distribution (funding vs hiring vs job changes etc) — no other charts
- Color warning on cost card: yellow at 80% of daily cap, red at 100%
- Time range: today + last 7 days (no configurable date picker)

### CLI Chat Experience
- Workspace selection on launch (interactive picker), switchable mid-session via `/workspace` command
- Colored text + tables for agent outputs (leads, campaigns, research) using chalk or similar
- Prompt format: `[workspace] >` (e.g., `[rise] >`, `[outsignal] >`)
- Utility commands: `/help`, `/workspace`, `/clear`, `/exit` — everything else goes to the orchestrator
- Entry point: `npm run chat`

### Session Persistence
- Every CLI session auto-saves as an AgentRun record on exit — zero friction
- No session resume — always start fresh. Previous sessions exist for audit only
- Full conversation recorded: all messages (user + agent), workspace used, timestamp, duration, tools called

### Claude's Discretion
- Exact color palette for signal type badges
- Table pagination or virtual scroll for large signal feeds
- Loading skeleton design for dashboard
- Error state handling for API failures
- Exact chalk color scheme for CLI output

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-signal-dashboard-cli-chat*
*Context gathered: 2026-03-04*
