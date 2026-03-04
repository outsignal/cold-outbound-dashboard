# Phase 20: Copy Strategy Framework - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The Writer Agent supports multiple copy strategies (Creative Ideas, PVP, one-liner, custom) with per-campaign selection, per-client KB examples tagged by strategy+industry, groundedIn validation for Creative Ideas, and signal-aware copy generation. Static campaign copy continues to work as before.

</domain>

<decisions>
## Implementation Decisions

### Strategy Definitions
- **4 strategies at launch**: Creative Ideas, PVP (Problem-Value-Proof), One-liner, Custom
- **Creative Ideas**: produces 3 separate email variants, each built around one idea grounded in a specific client offering. Admin picks the best variant
- **PVP**: classic Problem → Value → Proof framework. One email per sequence step
- **One-liner**: short, punchy cold email format
- **Custom**: admin provides a freeform text prompt describing their copy approach. Writer uses it as system instructions alongside KB best practices

### KB Examples & Tagging
- Tags use **strategy + industry** (e.g., `creative-ideas-branded-merchandise`, `pvp-recruitment`) — more reusable than strategy + client slug
- **Tiered retrieval**: First match strategy + industry. If none: strategy-only match. If none: general KB best practices. Always consults general KB too
- **Writer cites sources** — output includes a "References" section listing which KB docs influenced the copy
- Start with a curated set of examples per combo; data-driven optimization deferred to future phase
- Ingestion via existing CLI script with appropriate tags

### GroundedIn Validation (Creative Ideas)
- **Hard reject** — if writer can't trace an idea to a real client service/offering, it MUST NOT include that idea
- Writer checks **all sources**: KB docs, onboarding document, workspace data to ground ideas
- **Partial output allowed** — if only 1-2 ideas are groundable, output what it can with a note. Minimum 1 idea
- **groundedIn field visible to admin** — admin sees which offering each idea is grounded in for quality review

### Signal-Aware Copy Rules
- **Separate layer** that applies on top of any strategy (not per-strategy rules)
- **Never mention the triggering signal** — writer infers relevance and picks the right angle/offering, frames as value not surveillance
- **Signal-type → angle mapping**: each signal type maps to a recommended copy angle (funding → growth, hiring → scaling, etc.). Guidance not rigid template
- **High-intent leads (2+ stacked signals)**: same professional tone, but writer picks the strongest angle from multiple signals. No urgency change

### Claude's Discretion
- One-liner strategy output format and structure
- Exact signal-type → angle mapping definitions
- How the writer technically queries KB with tiered retrieval
- Sequence step structure for PVP campaigns
- Error handling when no KB examples exist for a strategy+industry combo

</decisions>

<specifics>
## Specific Ideas

- Creative Ideas should produce 3 separate full email drafts (not 3 ideas in one email) — admin picks the best
- GroundedIn field should be part of the structured output, not just a comment
- Signal context is a "why now" hint for the writer, never exposed to the recipient

</specifics>

<deferred>
## Deferred Ideas

- **Response-data-driven KB optimization** — track which copy examples lead to better reply/interested rates, surface top performers, retire underperformers. Should be its own phase
- A/B testing framework for strategy variants

</deferred>

---

*Phase: 20-copy-strategy-framework*
*Context gathered: 2026-03-04*
