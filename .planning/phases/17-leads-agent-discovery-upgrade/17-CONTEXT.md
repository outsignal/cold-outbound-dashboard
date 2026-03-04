# Phase 17: Leads Agent Discovery Upgrade - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the Leads Agent from having raw discovery tools (Phase 16) into a full discovery engine. The agent classifies ICP type, selects appropriate sources, generates an approval plan with cost/quota projections, deduplicates against existing Person DB, auto-promotes qualified leads, and feeds them into the enrichment waterfall. Signal monitoring (Phase 18) and copy strategy (Phase 20) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Discovery plan format
- Full breakdown in the plan: sources selected, filters per source, estimated cost per source, estimated volume per source, total cost, quota impact
- Brief 1-line reasoning per source explaining why it was chosen (e.g., "Apollo — best for enterprise B2B with seniority filters")
- Chat-based plan modifications — admin replies to adjust ("remove Serper, add Apollo with seniority=VP"), agent regenerates and re-presents
- Confirm-then-execute flow — after admin approves, agent says "Starting discovery — estimated ~30 seconds..." before firing API calls
- Per-source results breakdown after execution: "Apollo: 142 found, 18 dupes skipped, 124 staged. Total: 206 new leads."
- Totals with sample duplicate names shown (not full list)

### ICP classification & routing
- Agent decides freely which sources to use — no hard-coded ICP categories
- System prompt guidance from Phase 16 suggests source recommendations (enterprise → Apollo/Prospeo, niche → Firecrawl, local → Maps) as starting points
- Admin reviews and overrides via the approval plan
- On ambiguous requests, agent makes its best guess and builds the plan — the plan IS the clarification step
- AI Ark is an equal peer to Apollo/Prospeo (three people search sources, not a fallback)

### Dedup & promotion flow
- Triple-match dedup: email (exact), LinkedIn URL (exact), or full name + company domain (fuzzy)
- Non-duplicate leads auto-promote from DiscoveredPerson to Person table (no manual review step)
- Promoted leads immediately enter the enrichment waterfall (FindyMail → Prospeo → AI Ark → LeadMagic)
- The approval gate is at the plan stage, not at individual lead level

### Quota enforcement
- Soft limit — warn when discovery plan would exceed quota, let admin decide to proceed or reduce scope
- Before/after quota display: "Quota: 500/2,000 used → estimated 700/2,000 after this search (200 new leads)"
- Only promoted leads count against quota (duplicates are free)
- Rolling 30-day window for quota tracking (not calendar month)
- Quota usage visible on workspace settings page

### Claude's Discretion
- Exact dedup matching algorithm (fuzzy name+company threshold)
- Discovery plan text formatting in agent chat
- Error handling when individual sources fail mid-discovery
- How to handle partial results (some sources succeed, some fail)

</decisions>

<specifics>
## Specific Ideas

- "There should be an admin approval after agent selects and before work starts" — the plan-approve-execute flow is core to the UX
- Agent makes best guess on ambiguous requests — the plan IS the clarification step, not a separate Q&A
- AI Ark as equal option alongside Apollo/Prospeo, not a fallback — gives the agent three people search sources to choose from

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-leads-agent-discovery-upgrade*
*Context gathered: 2026-03-04*
