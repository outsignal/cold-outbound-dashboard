# Phase 32: Deliverability Dashboard & Reporting - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface all deliverability data across the admin dashboard (new Deliverability page), Intelligence Hub (bento card), weekly digest (Monday Slack + email), and client portal (enhanced email-health page). All data already exists from Phases 29-31 — this phase is purely presentation and reporting.

</domain>

<decisions>
## Implementation Decisions

### Dashboard layout
- New Deliverability page with three sections top-to-bottom: domain health cards, sender table, activity feed
- Domain cards show all domains by default with a workspace dropdown filter to narrow
- Each domain card shows: domain name, SPF/DKIM/DMARC pass/fail badges (green/red), blacklist status indicator, active sender count, overall health chip
- Sender table columns (sortable): email address, workspace, health status chip (colored), 30-day bounce rate sparkline, current bounce %, warmup progress bar, last checked timestamp
- Full detail view — no compact mode
- DASH-05: Add "Deliverability" link to admin sidebar navigation

### Activity feed
- Chronological (reverse) timeline of EmailHealthEvent entries below the sender table
- Each entry shows: timestamp, sender email, from->to status transition, reason, action taken
- Left border or dot color-coded by target status: green (healthy/recovery), yellow (elevated), orange (warning), red (critical)
- Default: show last 20 events with "Load more" button
- Natural page flow: domain overview -> sender detail -> event history

### Weekly digest
- Channels: Slack (ops channel) + admin email — same content, both channels
- Schedule: Monday 8am UTC (cron-job.org)
- Content: summary + highlights format
  - Overall stats: X domains healthy, Y at-risk
  - Worst-performing domain highlighted
  - Total transitions this week
  - Any senders currently in warning/critical listed
- Week-over-week bounce rate trends with up/down arrows per workspace
- Wrapped with audited() for audit trail

### Intelligence Hub integration
- INTEL-01: Deliverability summary bento card showing domains healthy vs at-risk, worst domain name
- INTEL-02: Auto-generate insight records when senders transition to warning/critical (feeds existing insight system)

### Client portal exposure
- Enhance existing /portal/email-health page (not a new page)
- Per-sender: health status chip, current bounce rate percentage
- Recent action note when applicable: "Daily limit reduced", "Removed from campaigns — warmup active"
- Domain-level: SPF/DKIM/DMARC pass/fail badges shown to all clients
- No raw event history or activity feed — just current state + recent action notes
- Scoped to client's workspace only

### Claude's Discretion
- Sparkline rendering approach (SVG, canvas, or library)
- Warmup progress bar calculation and visualization
- Bento card sizing and placement within Intelligence Hub
- Email digest HTML template design (follow existing Outsignal email patterns)
- Exact sidebar icon for Deliverability link

</decisions>

<specifics>
## Specific Ideas

- The deliverability page should follow the existing admin dashboard patterns (dark header, card-based sections)
- Showing automated actions to clients builds trust — they see the system actively protecting their deliverability
- DNS badges useful for consultancy clients (like Covenco) who manage their own DNS

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 32-deliverability-dashboard-reporting*
*Context gathered: 2026-03-11*
