# Phase 24: Campaign Analytics Engine - Research

**Researched:** 2026-03-09
**Domain:** Campaign performance metrics, daily snapshots, data visualization
**Confidence:** HIGH

## Summary

Phase 24 builds the Campaign Analytics Engine — daily snapshot cron jobs that pull email metrics from EmailBison API and compute LinkedIn metrics from local DB, storing pre-computed results in the existing CachedMetrics model. A new `/admin/analytics` page presents campaign rankings, per-step sequence analytics, and copy strategy comparison.

The project already has all infrastructure pieces in place: EmailBison client with campaign stats (sent/opened/replied/bounced/interested fields on Campaign type), Reply model with classified intents and sequence step data, Campaign model with `copyStrategy` field, LinkedInAction and LinkedInDailyUsage models for LinkedIn metrics, `recharts` for visualization, `nuqs` for URL state, cron auth via `validateCronSecret`, and the unused CachedMetrics model ready for population. No new dependencies required.

**Primary recommendation:** Build the cron endpoint first to populate CachedMetrics daily, then the API routes for analytics queries, then the admin UI. Use the existing CachedMetrics model with a modified unique constraint (add date dimension) to store daily snapshots per campaign.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Email metrics** from EmailBison API (sent, opened, replied, bounced counts per campaign) -- pulled daily
- **LinkedIn metrics** from local LinkedInAction records (connections sent, connections accepted, messages sent, profile views) -- computed from DB
- **Classification-enriched metrics** from local Reply table (interested count, objection count, sentiment breakdown) -- supplements raw counts from both channels
- **Snapshot frequency**: Daily via external cron (cron-job.org), one workspace per invocation (~every 10 min, cycling through 7 workspaces). Each run well within 30s timeout
- **Storage**: Daily history -- one CachedMetrics row per campaign per day. Enables trend analysis and time-period comparisons for downstream phases
- Dedicated **`/admin/analytics`** page -- separate from existing `/campaigns` management page
- **Workspace selector** dropdown (same pattern as replies page) -- "All workspaces" default, plus individual workspace scoping
- **Table columns**: Campaign name, workspace, channel (email/linkedin/both), sent, reply rate, open rate, bounce rate, interested rate
- **Default sort**: Reply rate descending. All columns sortable
- **Time period filter**: 24h, 7d, 30d, All time chips -- metrics computed from snapshots within selected period
- Per-step sequence analytics shown as **expandable detail** when clicking a campaign row
- **Horizontal bar chart** -- Step 1, Step 2, Step 3... as bars showing reply count/rate per step
- **Combined multi-channel view** with channel badge (email/LinkedIn) on each step
- Each step shows: sent, replied, reply rate, plus **mini intent distribution**
- **Auto-detect strategy from email body content** using AI classification (not manual tagging)
- Detection runs **once at deploy time** -- result stored on Campaign model. No ongoing AI cost
- **Strategies**: creative-ideas, PVP, one-liner, plus custom string for new approaches
- Presented as **grouped summary cards** on the analytics page -- one card per strategy

### Claude's Discretion
- Auto-detection prompt design and classification approach for copy strategy
- Bar chart styling and color scheme for per-step analytics
- Summary card layout and visual design
- How to handle campaigns with zero or very few sends (minimum threshold for ranking)
- CachedMetrics key structure and schema design for daily snapshots

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANAL-01 | Campaign performance metrics (sent, opened, replied, bounced, interested) are stored locally via daily snapshot cron | CachedMetrics model exists with `@@unique([workspace, metricType])`. Schema needs migration to add `date` field for daily snapshots. EmailBison Campaign type already has `emails_sent`, `opened`, `unique_opens`, `replied`, `unique_replies`, `bounced`, `interested` fields. Cron auth pattern established in `validateCronSecret`. |
| ANAL-02 | Admin can rank and compare campaigns within a workspace by reply rate, open rate, bounce rate, and interested rate | Computed rates derived from snapshot data. UI pattern established in replies page (workspace selector, date range chips, sortable table). `nuqs` for URL state, `recharts` for charts. |
| ANAL-03 | Admin can see per-step sequence analytics showing which email step generates the most replies | Reply model has `sequenceStep` field (int). Campaign model has `emailSequence` (JSON with position, subjectLine, body). EmailBison `getSequenceSteps(campaignId)` returns steps with position. Reply records can be grouped by `sequenceStep` + `campaignId`. |
| ANAL-04 | Admin can compare copy strategy effectiveness with aggregate metrics across campaigns | Campaign model already has `copyStrategy` field (creative-ideas/pvp/one-liner/custom/null). Some campaigns may have null -- backfill via AI detection at deploy time or one-time migration. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.x | ORM + CachedMetrics queries | Already project ORM, raw SQL for aggregations |
| recharts | 2.x | Bar charts, visualization | Already installed and used in 11 components |
| nuqs | latest | URL state for filters/sort | Already used in replies page for same pattern |
| Next.js API Routes | 16 | Cron endpoint + analytics API | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @ai-sdk/anthropic | latest | Copy strategy auto-detection | One-time classification of campaign email bodies |
| zod | latest | API response validation | Already used throughout project |
| lucide-react | latest | Icons for UI | Already used throughout project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CachedMetrics daily rows | Compute on-the-fly from EmailBison API | Would be slow, rate-limited, and not cacheable. Snapshots are the right call. |
| recharts horizontal bar | Custom SVG bars | recharts is already the project standard, no reason to deviate |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── cron/
│   │   │   └── snapshot-metrics/
│   │   │       └── route.ts          # Daily cron: pull EB metrics + compute LinkedIn metrics
│   │   └── analytics/
│   │       ├── campaigns/
│   │       │   └── route.ts          # GET: ranked campaign list with computed rates
│   │       ├── campaigns/[id]/steps/
│   │       │   └── route.ts          # GET: per-step sequence analytics for one campaign
│   │       └── strategies/
│   │           └── route.ts          # GET: copy strategy comparison aggregates
│   └── (admin)/
│       └── analytics/
│           └── page.tsx              # Analytics page with rankings + expandable steps + strategy cards
├── components/
│   └── analytics/
│       ├── campaign-rankings-table.tsx    # Sortable table with expandable rows
│       ├── step-analytics-chart.tsx       # Horizontal bar chart for per-step metrics
│       ├── strategy-comparison-cards.tsx  # Grouped summary cards per strategy
│       └── analytics-filters.tsx          # Workspace selector + time period chips
└── lib/
    └── analytics/
        ├── snapshot.ts              # Core snapshot logic (EB pull + LinkedIn compute + Reply stats)
        └── strategy-detect.ts       # AI copy strategy detection prompt
```

### Pattern 1: CachedMetrics Schema Design
**What:** Daily snapshot rows per campaign per day
**When to use:** All metric storage for this phase

The existing CachedMetrics model has `@@unique([workspace, metricType])` which doesn't support daily history. Two approaches:

**Option A (Recommended): Evolve CachedMetrics schema**
Add a `date` field and change the unique constraint:
```typescript
model CachedMetrics {
  id         String   @id @default(cuid())
  workspace  String
  metricType String   // "campaign_snapshot"
  metricKey  String   // campaignId (Outsignal campaign ID)
  date       String   // "YYYY-MM-DD" UTC
  data       String   // JSON: { sent, opened, replied, bounced, interested, uniqueOpens, uniqueReplies, linkedinSent, linkedinAccepted, ... }
  computedAt DateTime @default(now())

  @@unique([workspace, metricType, metricKey, date])
  @@index([workspace, metricType])
  @@index([date])
}
```

**Option B: Encode date into metricType**
Keep schema unchanged, use `metricType = "campaign_snapshot:2026-03-09"` and `data` includes campaignId. Less clean but avoids migration.

**Recommendation: Option A.** The model is currently unused (zero rows), so migration is safe. Use `prisma db push` (project convention per STATE.md decision 23-01).

### Pattern 2: Cron Snapshot Endpoint
**What:** `/api/cron/snapshot-metrics?workspace=rise` called by cron-job.org
**When to use:** Daily metric collection

```typescript
// Follows exact same pattern as poll-replies and inbox-health/check
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = new URL(request.url).searchParams.get("workspace");
  if (!workspace) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }

  // 1. Fetch EmailBison campaigns for this workspace
  // 2. For each campaign: snapshot email metrics from EB Campaign object
  // 3. Compute LinkedIn metrics from LinkedInAction/LinkedInDailyUsage
  // 4. Compute Reply classification stats from Reply table
  // 5. Upsert into CachedMetrics with today's date
}
```

Key: One workspace per invocation (user decision). 7 cron-job.org jobs, each pointing to `?workspace={slug}`, staggered throughout the day.

### Pattern 3: Expandable Table Rows
**What:** Click campaign row to expand per-step analytics inline
**When to use:** Campaign rankings table

```typescript
// Client component pattern — track expanded row ID in state
const [expandedId, setExpandedId] = useState<string | null>(null);

// On expand, fetch step data lazily
useEffect(() => {
  if (expandedId) {
    fetch(`/api/analytics/campaigns/${expandedId}/steps`)
      .then(r => r.json())
      .then(setStepData);
  }
}, [expandedId]);
```

### Pattern 4: Copy Strategy Auto-Detection
**What:** AI classifies email body text into strategy type
**When to use:** One-time backfill for existing campaigns + at deploy time for new ones

```typescript
// Use Anthropic SDK (already in project) with a simple classification prompt
// Input: first email step body text
// Output: "creative-ideas" | "pvp" | "one-liner" | "custom"
// Store result on Campaign.copyStrategy field (already exists)
```

### Anti-Patterns to Avoid
- **Computing metrics on-the-fly from EmailBison API**: Rate limits + latency. Always read from CachedMetrics.
- **Storing all campaign data in a single CachedMetrics row**: One row per campaign per day. Not one giant JSON blob per workspace.
- **Re-running AI classification on every page load**: Copy strategy detection runs once and is stored. Never re-classify.
- **Fetching all CachedMetrics rows for "All time" view**: Use SQL aggregation (SUM/AVG) with date range filters. Return computed rates, not raw rows.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sortable table | Custom sort implementation | nuqs URL state + Array.sort on server | Consistent with replies page pattern |
| Bar charts | Custom SVG | recharts BarChart (horizontal layout) | Already 11 recharts components in project |
| Date range filtering | Custom date picker | ToggleChip chips (24h/7d/30d/All) | Exact same pattern from replies page |
| Cron authentication | Custom auth | `validateCronSecret` from `@/lib/cron-auth` | Already established |
| Rate computation | Compute in frontend | Compute in API response | Avoid division-by-zero in multiple places |

**Key insight:** This phase reuses almost every UI pattern from the replies page (Phase 23-04). The main new UI element is the expandable table row with embedded chart.

## Common Pitfalls

### Pitfall 1: Division by Zero in Rate Calculations
**What goes wrong:** `replied / sent` when sent = 0 produces NaN/Infinity
**Why it happens:** New campaigns may have 0 sends, or LinkedIn-only campaigns have 0 email sends
**How to avoid:** Always guard: `sent > 0 ? (replied / sent * 100) : 0`. Apply minimum threshold (e.g., 10+ sends) before including in rankings.
**Warning signs:** NaN or Infinity in JSON responses, blank cells in table

### Pitfall 2: CachedMetrics Unique Constraint Collision
**What goes wrong:** Re-running snapshot on same day creates duplicate key error
**Why it happens:** Cron may fire multiple times per day (retries, manual triggers)
**How to avoid:** Use Prisma `upsert` with the unique constraint fields. Always update, never create-or-fail.
**Warning signs:** Prisma P2002 unique constraint violation errors

### Pitfall 3: EmailBison Campaign ID Mismatch
**What goes wrong:** EmailBison campaign IDs (integers) don't match Outsignal campaign IDs (cuid strings)
**Why it happens:** Two separate systems with different ID schemes
**How to avoid:** Always look up via `Campaign.emailBisonCampaignId` to bridge the two. The CachedMetrics `metricKey` should use the Outsignal campaign ID (cuid), not the EmailBison integer ID.
**Warning signs:** Missing campaigns in analytics, orphaned snapshot rows

### Pitfall 4: Stale Strategy Detection for Null Campaigns
**What goes wrong:** Campaigns with `copyStrategy = null` (legacy) never get classified
**Why it happens:** Strategy field was added in Phase 20 but existing campaigns weren't backfilled
**How to avoid:** Include a one-time backfill script or integrate detection into the snapshot cron (detect if null, classify, store). But per user decision, detection runs "once at deploy time" -- so a migration/backfill script is the right approach.
**Warning signs:** Strategy comparison cards showing many "Unknown" campaigns

### Pitfall 5: 30-Second Cron Timeout
**What goes wrong:** Snapshot takes too long when a workspace has many campaigns
**Why it happens:** EmailBison API calls + LinkedIn DB queries + Reply stats per campaign
**How to avoid:** Each workspace invocation handles only its campaigns. Typical workspace has 2-5 campaigns. EmailBison `getCampaigns()` returns stats inline (no per-campaign API call needed). LinkedIn metrics are simple COUNT queries. Well within 30s.
**Warning signs:** cron-job.org timeout errors, partial snapshot data

### Pitfall 6: Per-Step Analytics Missing Sequence Step Data
**What goes wrong:** Many Reply records have `sequenceStep = null`
**Why it happens:** Polled replies don't capture sequence_step_order (see poll-replies code line 202: `sequenceStep: null`). Only webhook replies have this data.
**How to avoid:** Accept that per-step analytics will have an "Unknown step" bucket. Display it honestly. For campaigns with EmailBison sequence steps, also aggregate from the EmailBison API if step-level stats are available.
**Warning signs:** Large "Unknown" bucket in step charts

## Code Examples

### Snapshot Data Shape (CachedMetrics.data JSON)
```typescript
interface CampaignSnapshot {
  // EmailBison raw counts
  emailsSent: number;
  opened: number;
  uniqueOpens: number;
  replied: number;
  uniqueReplies: number;
  bounced: number;
  interested: number;
  totalLeads: number;
  totalLeadsContacted: number;

  // LinkedIn counts (from local DB)
  linkedinConnectionsSent: number;
  linkedinConnectionsAccepted: number;
  linkedinMessagesSent: number;
  linkedinProfileViews: number;

  // Classification stats (from Reply table)
  classifiedReplies: number;
  interestedReplies: number;  // intent = 'interested' or 'meeting_booked'
  objectionReplies: number;

  // Per-step breakdown (if available)
  stepStats?: Array<{
    step: number;
    channel: "email" | "linkedin";
    sent: number;
    replied: number;
    interestedCount: number;
    objectionCount: number;
  }>;

  // Computed rates (stored for fast reads)
  replyRate: number;     // replied / sent * 100
  openRate: number;      // uniqueOpens / sent * 100
  bounceRate: number;    // bounced / sent * 100
  interestedRate: number; // interested / sent * 100

  // Campaign metadata (denormalized for display)
  campaignName: string;
  channels: string[];    // ["email"], ["linkedin"], ["email", "linkedin"]
  copyStrategy: string | null;
  status: string;
}
```

### Cron Endpoint Pattern
```typescript
// Source: Existing poll-replies and inbox-health/check patterns
import { validateCronSecret } from "@/lib/cron-auth";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { EmailBisonClient } from "@/lib/emailbison/client";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = new URL(request.url).searchParams.get("workspace");
  // ... fetch EB campaigns, compute metrics, upsert snapshots
}
```

### API Rate Computation
```typescript
// Always compute rates server-side to avoid frontend division errors
function computeRates(snapshot: CampaignSnapshot) {
  const emailSent = snapshot.emailsSent || 0;
  return {
    replyRate: emailSent > 0 ? (snapshot.replied / emailSent) * 100 : 0,
    openRate: emailSent > 0 ? (snapshot.uniqueOpens / emailSent) * 100 : 0,
    bounceRate: emailSent > 0 ? (snapshot.bounced / emailSent) * 100 : 0,
    interestedRate: emailSent > 0 ? (snapshot.interested / emailSent) * 100 : 0,
  };
}
```

### Copy Strategy AI Detection
```typescript
// Simple classification prompt -- runs once per campaign
const STRATEGY_DETECT_PROMPT = `Classify this cold email into one of these copy strategies:
- "creative-ideas": Opens with creative/unconventional ideas related to the prospect's business
- "pvp": Problem-Value-Proof structure (states a problem, offers value, provides proof/social proof)
- "one-liner": Ultra-short (1-3 sentences), direct ask with minimal preamble

Respond with ONLY the strategy name. If none match clearly, respond "custom".

Email body:
{body}`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CachedMetrics unused | CachedMetrics for daily snapshots | Phase 24 | First real usage of the model |
| Campaign.copyStrategy nullable | Backfilled via AI detection | Phase 24 | Enables strategy comparison |
| Metrics only from EmailBison API | Metrics pre-computed locally | Phase 24 | Fast page loads, no API dependency at read time |

**Key existing infrastructure:**
- EmailBison Campaign type already has `emails_sent`, `opened`, `unique_opens`, `replied`, `unique_replies`, `bounced`, `interested`, `total_leads`, `total_leads_contacted` fields -- all accessible via `getCampaigns()`
- Reply model has `sequenceStep`, `intent`, `sentiment`, `campaignId` fields from Phase 23
- Campaign model has `copyStrategy` field from Phase 20
- LinkedInDailyUsage has `connectionsSent`, `messagesSent`, `profileViews`, `connectionsAccepted` per sender per day
- LinkedInAction has `actionType`, `status`, `workspaceSlug`, `campaignName` for per-campaign LinkedIn stats

## Open Questions

1. **EmailBison per-step metrics availability**
   - What we know: EmailBison has `getSequenceSteps(campaignId)` that returns `SequenceStep` with `position`, `subject`, `body`. The Reply webhook includes `scheduled_email.sequence_step_order`.
   - What's unclear: Whether EmailBison provides per-step sent/opened/replied counts via API (not just aggregate campaign counts). The SequenceStep type only shows `id`, `campaign_id`, `position`, `subject`, `body`, `delay_days`.
   - Recommendation: For email per-step analytics, aggregate from local Reply table grouped by `sequenceStep`. This avoids any API dependency and uses data already captured. For sent-per-step, this data isn't available locally -- show reply counts per step (which IS available) and note that sent-per-step requires EmailBison API investigation. Worst case: show reply count per step without reply rate (since we don't know sent-per-step).

2. **LinkedIn per-step attribution**
   - What we know: LinkedInAction has `sequenceStepRef` field (string) linking to campaign sequence step.
   - What's unclear: How consistently this is populated. Campaign model has `linkedinSequence` with position-based steps.
   - Recommendation: Group LinkedInAction by `sequenceStepRef` where available, fall back to "all LinkedIn activity" when not.

3. **Minimum threshold for ranking**
   - What we know: User wants to filter out campaigns with zero or very few sends.
   - Recommendation: Use 10+ total sends as minimum threshold. Show campaigns below threshold in a separate "insufficient data" section or simply gray them out.

## Sources

### Primary (HIGH confidence)
- Project schema: `prisma/schema.prisma` -- CachedMetrics model, Campaign model, Reply model, LinkedInAction model
- EmailBison types: `src/lib/emailbison/types.ts` -- Campaign interface with all metric fields
- EmailBison client: `src/lib/emailbison/client.ts` -- getCampaigns(), getSequenceSteps() methods
- Existing cron patterns: `src/app/api/cron/poll-replies/route.ts` -- auth, workspace iteration, error handling
- Existing analytics UI: `src/app/(admin)/replies/page.tsx` -- workspace selector, date range chips, nuqs state management
- Existing charts: `src/components/replies/reply-stats.tsx` -- recharts BarChart usage patterns

### Secondary (MEDIUM confidence)
- Copy strategy field usage: `src/lib/agents/writer.ts`, `src/lib/campaigns/operations.ts` -- confirms copyStrategy values
- LinkedIn metrics source: LinkedInDailyUsage model fields confirmed in schema

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new dependencies
- Architecture: HIGH -- follows exact patterns from Phase 23 (cron, API routes, admin page, recharts)
- Pitfalls: HIGH -- identified from direct code inspection (null sequenceStep, EB ID mismatch, division by zero)
- CachedMetrics schema evolution: HIGH -- model exists unused, safe to modify via db push

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- all internal project patterns, no external API changes expected)
