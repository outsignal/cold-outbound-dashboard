# Phase 26: Cross-Workspace Benchmarking & ICP Calibration - Research

**Researched:** 2026-03-10
**Domain:** Analytics dashboard — benchmarking, ICP calibration, signal effectiveness
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Dual baselines** -- show both global average (computed from all workspaces' CachedMetrics) AND hardcoded industry reference bands per vertical
- **Channel-aware metrics** -- metrics depend on workspace channels: email (reply rate, bounce rate, interested rate), LinkedIn (connection accept rate, message reply rate), multi-channel (both)
- **Gauge/thermometer visualization** -- horizontal bar with colored zones (red/yellow/green) for low/avg/high, workspace's value shown as a marker on the bar
- **Industry benchmarks** -- hardcode initial reference data for the 6 active verticals (Branded Merchandise, Recruitment Services, Architecture Project Management, B2B Lead Generation, Business Acquisitions, Umbrella Company Solutions). Easy to update later
- **Always all-time data** -- benchmarks don't respect the time period filter, always use full dataset for statistical significance
- **Bucket chart for ICP** -- group ICP scores into buckets (0-20, 21-40, 41-60, 61-80, 81-100) and show reply/interested rate per bucket as bar chart
- **ICP source** -- `Person.icpScore` field, cross-referenced with Reply outcomes
- **Recommendation card** -- below the bucket chart showing suggested threshold adjustment with current vs recommended threshold, evidence, and confidence indicator
- **Per-workspace with global toggle** -- default shows calibration for selected workspace, toggle to see global view
- **Ranked signal cards** -- one card per signal type showing reply rate, interested rate, and volume, ranked best to worst
- **Signal vs static comparison** -- show signal campaign metrics alongside static campaign baseline
- **New "Benchmarks" tab** on existing `/admin/analytics` page -- three tabs: Performance | Copy | Benchmarks
- **Vertical stack within tab** -- Reference Bands at top, ICP Calibration middle, Signal Effectiveness bottom
- **Shared page-level workspace filter** -- uses existing workspace selector in analytics page header
- **All-time data only** -- benchmarks ignore the time period filter for statistical significance

### Claude's Discretion
- Gauge/thermometer color zones and breakpoints
- Exact industry benchmark values per vertical (research reasonable defaults)
- Bucket chart styling and bar colors
- Recommendation card confidence threshold logic
- How to handle workspaces with no signal campaigns (empty state)
- Signal vs static comparison card visual design

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BENCH-01 | Admin can benchmark workspace performance against all other workspaces with industry reference bands | Gauge visualization pattern, hardcoded industry benchmarks, CachedMetrics aggregation, channel-aware metric selection |
| BENCH-02 | Admin can compare performance grouped by vertical, copy strategy, and time period | Vertical grouping from Workspace.vertical, CachedMetrics with copyStrategy, all-time aggregation |
| BENCH-03 | Admin can see ICP score calibration -- correlation between ICP scores at send time and actual reply/conversion outcomes | PersonWorkspace.icpScore cross-referenced with Reply table, bucket chart pattern |
| BENCH-04 | Admin can see recommended ICP threshold adjustments based on calibration data with confidence indicators | Statistical threshold recommendation algorithm, confidence based on sample size |
| BENCH-05 | Admin can see signal-to-conversion tracking showing which signal types produce the best reply outcomes | SignalCampaignLead + Reply cross-join, Campaign.type/signalTypes, signal vs static comparison |
</phase_requirements>

## Summary

This phase adds a "Benchmarks" tab to the existing analytics page at `/admin/analytics`. The tab contains three vertically stacked sections: Reference Bands (workspace performance vs global/industry averages), ICP Calibration (score-to-outcome correlation with threshold recommendations), and Signal Effectiveness (signal type performance ranking with static baseline comparison).

The technical approach is straightforward: all data already exists in the database (CachedMetrics snapshots, PersonWorkspace.icpScore, Reply classifications, SignalCampaignLead, Campaign.signalTypes). The work is primarily new API endpoints that aggregate from these existing models, plus new React client components using Recharts (already installed at v3.7.0) for the gauge and bucket chart visualizations.

A critical data reality: current production data is very sparse (10 ICP-scored people, 2 replies, 0 signal events, 0 cached metrics). Every component MUST have robust empty states. The UI should gracefully degrade when insufficient data exists, showing "Not enough data" cards rather than misleading charts.

**Primary recommendation:** Build three new API endpoints (`/api/analytics/benchmarks/reference-bands`, `/api/analytics/benchmarks/icp-calibration`, `/api/analytics/benchmarks/signal-effectiveness`) that aggregate from existing CachedMetrics + Reply + PersonWorkspace + SignalCampaignLead tables, then add a `BenchmarksTab` component to the analytics page following the same lazy-loading pattern as the existing CopyTab.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.7.0 | Bar charts, gauge visualization | Already installed, used in 12+ components across the project |
| nuqs | (installed) | URL state for tab persistence | Already used on analytics page for `tab` param |
| prisma | 6 | DB queries for aggregation | Project ORM, all models already defined |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @/components/ui/* | (shadcn) | Card, Select, Skeleton components | All UI chrome around charts |
| @/lib/db | (prisma) | Database client singleton | All API route data access |
| @/lib/require-admin-auth | (custom) | Auth guard | All new API endpoints |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts gauge | Custom SVG/CSS | Recharts already in bundle; custom SVG adds maintenance burden |
| Raw SQL | Prisma queries | Raw SQL needed for complex cross-table aggregations with CASE expressions |

**Installation:**
```bash
# No new dependencies needed -- everything is already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/analytics/benchmarks/
│   ├── reference-bands/route.ts      # BENCH-01, BENCH-02
│   ├── icp-calibration/route.ts      # BENCH-03, BENCH-04
│   └── signal-effectiveness/route.ts # BENCH-05
├── components/analytics/
│   ├── benchmarks-tab.tsx            # Tab container (lazy loads data)
│   ├── reference-band-gauge.tsx      # Single metric gauge component
│   ├── reference-bands-section.tsx   # Section with multiple gauges
│   ├── icp-calibration-section.tsx   # Bucket chart + recommendation card
│   └── signal-effectiveness-section.tsx  # Signal cards + static comparison
└── lib/analytics/
    └── industry-benchmarks.ts        # Hardcoded reference bands per vertical
```

### Pattern 1: Tab Lazy Loading (existing pattern from CopyTab)
**What:** Only fetch data when the Benchmarks tab is active
**When to use:** The analytics page has 3 tabs; only the active one should trigger API calls
**Example:**
```typescript
// In analytics/page.tsx -- extend tab state
const isPerformanceTab = params.tab === "performance";
const isCopyTab = params.tab === "copy";
const isBenchmarksTab = params.tab === "benchmarks";

// Benchmarks tab renders its own component that fetches internally
{isBenchmarksTab && (
  <BenchmarksTab workspace={params.workspace || null} />
)}
```

### Pattern 2: CachedMetrics Aggregation
**What:** Read latest campaign snapshots from CachedMetrics to compute workspace-level averages
**When to use:** Reference bands need aggregate rates across all campaigns in a workspace
**Example:**
```typescript
// Get latest snapshot per campaign (existing pattern from campaigns/route.ts)
const rows = await prisma.cachedMetrics.findMany({
  where: { metricType: "campaign_snapshot" },
  orderBy: { date: "desc" },
});
// Dedupe to latest per campaign, then aggregate per workspace
const latestPerCampaign = new Map<string, { workspace: string; data: CampaignSnapshot }>();
for (const row of rows) {
  if (!latestPerCampaign.has(row.metricKey)) {
    latestPerCampaign.set(row.metricKey, {
      workspace: row.workspace,
      data: JSON.parse(row.data),
    });
  }
}
```

### Pattern 3: Hardcoded Industry Reference Bands
**What:** Static lookup object mapping vertical name to benchmark ranges per metric
**When to use:** Industry reference bands need sensible defaults that are easy to update
**Example:**
```typescript
// src/lib/analytics/industry-benchmarks.ts
export interface IndustryBenchmark {
  low: number;   // Below this = red zone
  avg: number;   // Industry average (midpoint)
  high: number;  // Above this = green zone
}

export interface VerticalBenchmarks {
  replyRate: IndustryBenchmark;
  bounceRate: IndustryBenchmark;
  interestedRate: IndustryBenchmark;
  openRate: IndustryBenchmark;
  // LinkedIn-specific
  connectionAcceptRate?: IndustryBenchmark;
  messageReplyRate?: IndustryBenchmark;
}

export const INDUSTRY_BENCHMARKS: Record<string, VerticalBenchmarks> = {
  "Branded Merchandise": {
    replyRate: { low: 1.5, avg: 3.0, high: 6.0 },
    bounceRate: { low: 3.0, avg: 5.0, high: 8.0 }, // Note: lower is better
    interestedRate: { low: 0.5, avg: 1.5, high: 3.0 },
    openRate: { low: 30, avg: 50, high: 70 },
  },
  "Recruitment Services": {
    replyRate: { low: 2.0, avg: 4.0, high: 8.0 },
    bounceRate: { low: 2.0, avg: 4.0, high: 7.0 },
    interestedRate: { low: 1.0, avg: 2.0, high: 4.0 },
    openRate: { low: 35, avg: 55, high: 75 },
  },
  // ... remaining verticals
};

// Default fallback for unknown verticals
export const DEFAULT_BENCHMARKS: VerticalBenchmarks = {
  replyRate: { low: 1.0, avg: 2.5, high: 5.0 },
  bounceRate: { low: 2.0, avg: 4.0, high: 7.0 },
  interestedRate: { low: 0.5, avg: 1.5, high: 3.0 },
  openRate: { low: 30, avg: 50, high: 70 },
};
```

### Pattern 4: ICP Calibration Cross-Query
**What:** Join PersonWorkspace.icpScore with Reply outcomes via Person.email = Reply.senderEmail
**When to use:** BENCH-03 requires correlating ICP scores at send time with reply outcomes
**Example:**
```typescript
// Raw SQL for efficient cross-table aggregation
const buckets = await prisma.$queryRaw`
  SELECT
    CASE
      WHEN pw."icpScore" BETWEEN 0 AND 20 THEN '0-20'
      WHEN pw."icpScore" BETWEEN 21 AND 40 THEN '21-40'
      WHEN pw."icpScore" BETWEEN 41 AND 60 THEN '41-60'
      WHEN pw."icpScore" BETWEEN 61 AND 80 THEN '61-80'
      WHEN pw."icpScore" BETWEEN 81 AND 100 THEN '81-100'
    END as bucket,
    COUNT(DISTINCT pw.id) as total_people,
    COUNT(DISTINCT r.id) as reply_count,
    COUNT(DISTINCT CASE WHEN r.intent IN ('interested', 'meeting_booked') THEN r.id END) as interested_count
  FROM "LeadWorkspace" pw
  JOIN "Lead" p ON p.id = pw."leadId"
  LEFT JOIN "Reply" r ON r."senderEmail" = p.email AND r."workspaceSlug" = pw.workspace
  WHERE pw."icpScore" IS NOT NULL
    ${workspace ? Prisma.sql`AND pw.workspace = ${workspace}` : Prisma.empty}
  GROUP BY bucket
  ORDER BY bucket
`;
```

### Pattern 5: Signal Effectiveness Cross-Query
**What:** Join Campaign (type='signal') with SignalCampaignLead and Reply to get per-signal-type outcomes
**When to use:** BENCH-05 requires tracking which signal types produce the best outcomes
**Example:**
```typescript
// Signal campaigns have signalTypes JSON field (e.g. ["funding", "hiring_spike"])
// SignalCampaignLead links campaigns to people with signalEventId
// Reply tracks outcomes per workspace

// Approach: query signal campaigns, parse signalTypes, aggregate reply outcomes
const signalCampaigns = await prisma.campaign.findMany({
  where: { type: "signal", ...(workspace ? { workspaceSlug: workspace } : {}) },
  select: { id: true, signalTypes: true, workspaceSlug: true },
});
```

### Anti-Patterns to Avoid
- **Computing benchmarks on every page load:** All-time aggregation across all workspaces is expensive. Pre-compute in the snapshot cron or use CachedMetrics for workspace-level aggregates.
- **Showing misleading charts with low data:** With only 2 replies and 10 ICP scores in production, empty states are more honest than charts with 1-2 data points.
- **Mixing email and LinkedIn metrics in the same gauge:** A LinkedIn-only workspace should not show "bounce rate" (email metric) -- the UI must be channel-aware.
- **Hardcoding workspace slugs:** Always use Workspace.vertical to determine which industry benchmark to apply, not the slug.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gauge/thermometer chart | Custom canvas drawing | Recharts BarChart with reference lines or custom SVG with CSS | Recharts handles responsive container, tooltips |
| URL state management | Manual query string parsing | nuqs (already used) | Tab state, workspace filter already managed by nuqs |
| Percentile calculations | Custom sorting/slicing | Simple arithmetic on pre-computed rates | Only 6-8 workspaces; statistical libraries are overkill |
| Empty state detection | Ad-hoc checks per component | Shared `hasEnoughData(count, minThreshold)` helper | Consistent "not enough data" experience |

**Key insight:** This phase is primarily data aggregation + visualization. The data models are complete. No new DB migrations needed. The complexity is in the cross-table SQL queries and making gauges/charts look good with sparse data.

## Common Pitfalls

### Pitfall 1: CachedMetrics May Be Empty
**What goes wrong:** The `snapshot-metrics` cron may not have run yet, so CachedMetrics has 0 rows (confirmed: production has 0 cached metrics rows currently).
**Why it happens:** Cron hasn't been triggered for any workspace yet.
**How to avoid:** Every API endpoint must handle the case where CachedMetrics returns empty results. Return structured empty responses that the UI renders as "Run the analytics snapshot first" guidance.
**Warning signs:** API returns 200 with empty arrays, charts render with no bars.

### Pitfall 2: ICP Scores Are Workspace-Specific
**What goes wrong:** Using `Person.icpScore` (which does not exist) instead of `PersonWorkspace.icpScore`.
**Why it happens:** The CONTEXT.md says "Person.icpScore" but the actual field is on `PersonWorkspace` (not `Person`). The Person model has no icpScore field.
**How to avoid:** Always query `PersonWorkspace.icpScore` and filter by `workspace` for per-workspace calibration. The "global toggle" aggregates across all workspaces.
**Warning signs:** Prisma errors about unknown field on Person model.

### Pitfall 3: Bounce Rate Is Inverted
**What goes wrong:** Showing bounce rate on a gauge where green = high and red = low.
**Why it happens:** Bounce rate is a "lower is better" metric, opposite to reply rate and interested rate.
**How to avoid:** The gauge component must accept an `inverted` flag. For bounce rate, red zone should be at the HIGH end.
**Warning signs:** A workspace with 8% bounce rate showing in green zone.

### Pitfall 4: Channel Detection From Campaign Channels
**What goes wrong:** Showing email metrics for a LinkedIn-only workspace or vice versa.
**Why it happens:** Campaigns have a `channels` JSON field (e.g. `["email"]`, `["linkedin"]`, `["email","linkedin"]`). If all campaigns in a workspace are LinkedIn-only, email metrics are irrelevant.
**How to avoid:** When computing workspace-level benchmarks, determine which channels are active based on the campaigns' `channels` field (not `Workspace.enabledModules`, which is package config not usage). Show only relevant metric gauges.
**Warning signs:** Gauges showing 0% for all email metrics on a LinkedIn workspace.

### Pitfall 5: signalTypes Is JSON String, Not Array
**What goes wrong:** Treating `Campaign.signalTypes` as a native array.
**Why it happens:** Prisma stores it as a string column containing JSON. Must `JSON.parse()` it.
**How to avoid:** Always parse with try/catch and default to empty array.
**Warning signs:** TypeError when trying to iterate signalTypes.

### Pitfall 6: Reply-to-Campaign Attribution
**What goes wrong:** ICP calibration tries to correlate ICP score with replies, but the join path is indirect.
**Why it happens:** Reply has `senderEmail` and `campaignId`, PersonWorkspace has `personId` and `workspace`. The join path is: PersonWorkspace -> Person (by personId) -> Reply (by Person.email = Reply.senderEmail AND PersonWorkspace.workspace = Reply.workspaceSlug).
**How to avoid:** Use raw SQL with explicit JOINs rather than trying to chain Prisma includes.
**Warning signs:** Prisma relation errors or incorrect counts.

## Code Examples

### Gauge/Thermometer Component
```typescript
// Horizontal bar with colored zones and value marker
// Using pure CSS/SVG -- simpler than forcing Recharts into a gauge shape

interface GaugeProps {
  label: string;
  value: number;           // The workspace's actual value
  globalAvg: number;       // Computed from all workspaces
  industry: IndustryBenchmark; // { low, avg, high }
  unit?: string;           // "%" default
  inverted?: boolean;      // true for bounce rate (lower = better)
}

function ReferenceGauge({ label, value, globalAvg, industry, unit = "%", inverted = false }: GaugeProps) {
  // Scale: 0 to industry.high * 1.5 (so markers don't clip at edge)
  const maxScale = industry.high * 1.5;
  const pct = (v: number) => Math.min((v / maxScale) * 100, 100);

  // Zone colors: for inverted metrics, swap red/green
  const zones = inverted
    ? [
        { from: 0, to: pct(industry.low), color: "bg-green-500/20" },
        { from: pct(industry.low), to: pct(industry.high), color: "bg-yellow-500/20" },
        { from: pct(industry.high), to: 100, color: "bg-red-500/20" },
      ]
    : [
        { from: 0, to: pct(industry.low), color: "bg-red-500/20" },
        { from: pct(industry.low), to: pct(industry.high), color: "bg-yellow-500/20" },
        { from: pct(industry.high), to: 100, color: "bg-green-500/20" },
      ];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums font-semibold">{value.toFixed(1)}{unit}</span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden bg-muted">
        {zones.map((zone, i) => (
          <div
            key={i}
            className={`absolute top-0 h-full ${zone.color}`}
            style={{ left: `${zone.from}%`, width: `${zone.to - zone.from}%` }}
          />
        ))}
        {/* Global average marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-muted-foreground/50"
          style={{ left: `${pct(globalAvg)}%` }}
          title={`Global avg: ${globalAvg.toFixed(1)}${unit}`}
        />
        {/* Industry average marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground/70 border-l border-dashed"
          style={{ left: `${pct(industry.avg)}%` }}
          title={`Industry avg: ${industry.avg.toFixed(1)}${unit}`}
        />
        {/* Workspace value marker (diamond/triangle) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-brand rotate-45 rounded-sm border border-brand-strong"
          style={{ left: `${pct(value)}%` }}
        />
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>Global: {globalAvg.toFixed(1)}{unit}</span>
        <span>Industry: {industry.avg.toFixed(1)}{unit}</span>
      </div>
    </div>
  );
}
```

### ICP Bucket Chart
```typescript
// Using Recharts BarChart for ICP score buckets
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface BucketData {
  bucket: string;       // "0-20", "21-40", etc.
  totalPeople: number;
  replyRate: number;
  interestedRate: number;
}

function IcpBucketChart({ buckets }: { buckets: BucketData[] }) {
  const BUCKET_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={buckets} margin={{ top: 10, right: 30, bottom: 0, left: 0 }}>
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="%" />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid var(--border)",
            backgroundColor: "var(--popover)",
            color: "var(--popover-foreground)",
          }}
        />
        <Bar dataKey="replyRate" name="Reply Rate" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {buckets.map((_, i) => (
            <Cell key={i} fill={BUCKET_COLORS[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### ICP Threshold Recommendation Logic
```typescript
interface ThresholdRecommendation {
  currentThreshold: number;
  recommendedThreshold: number;
  evidence: string;
  confidence: "high" | "medium" | "low";
  sampleSize: number;
}

function computeThresholdRecommendation(
  buckets: BucketData[],
  currentThreshold: number, // From Campaign.icpScoreThreshold (default 70)
): ThresholdRecommendation | null {
  const totalPeople = buckets.reduce((sum, b) => sum + b.totalPeople, 0);

  // Need at least 50 people with ICP scores to make a recommendation
  if (totalPeople < 50) return null;

  // Find the bucket boundary where interested rate drops significantly
  // Walk from highest bucket down, find where interestedRate drops below 50% of peak
  const sortedBuckets = [...buckets].sort((a, b) => {
    const aMin = parseInt(a.bucket.split("-")[0]);
    const bMin = parseInt(b.bucket.split("-")[0]);
    return bMin - aMin; // highest first
  });

  const peakRate = Math.max(...buckets.map(b => b.interestedRate));
  if (peakRate === 0) return null;

  let recommendedThreshold = currentThreshold;
  for (const bucket of sortedBuckets) {
    if (bucket.interestedRate >= peakRate * 0.5) {
      recommendedThreshold = parseInt(bucket.bucket.split("-")[0]);
    }
  }

  // Determine confidence based on sample size
  let confidence: "high" | "medium" | "low" = "low";
  if (totalPeople >= 200) confidence = "high";
  else if (totalPeople >= 100) confidence = "medium";

  const direction = recommendedThreshold > currentThreshold ? "raise" : recommendedThreshold < currentThreshold ? "lower" : "keep";
  const evidence =
    direction === "keep"
      ? `Current threshold of ${currentThreshold} aligns with data (${totalPeople} samples).`
      : `Data suggests ${direction === "raise" ? "raising" : "lowering"} threshold from ${currentThreshold} to ${recommendedThreshold}. People scoring ${recommendedThreshold}+ have ${peakRate.toFixed(1)}% interested rate vs lower buckets.`;

  return {
    currentThreshold,
    recommendedThreshold,
    evidence,
    confidence,
    sampleSize: totalPeople,
  };
}
```

### Empty State Pattern
```typescript
function EmptyBenchmarkState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Usage:
{metrics.length === 0 ? (
  <EmptyBenchmarkState
    title="No benchmark data yet"
    message="Run the analytics snapshot cron to populate campaign metrics, then benchmarks will appear here."
  />
) : (
  <ReferenceBandsSection data={metrics} />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts v2 | Recharts v3 (^3.7.0) | 2024 | New composable API, but project uses v3 already |
| Prisma groupBy for aggregation | Raw SQL ($queryRaw) for complex joins | Phase 23+ | Prisma groupBy cannot handle CASE expressions or multi-table aggregations |
| Manual chart proportions | ResponsiveContainer | Already used | All charts auto-resize |

**Deprecated/outdated:**
- Nothing relevant -- all project dependencies are current.

## Industry Benchmark Reference Values (Claude's Discretion)

These are reasonable cold email/LinkedIn outreach benchmarks based on industry knowledge. Confidence: MEDIUM -- derived from general industry data, not verified against a single authoritative source.

| Vertical | Reply Rate (low/avg/high) | Bounce Rate (low/avg/high) | Interested Rate (low/avg/high) | Open Rate (low/avg/high) |
|----------|--------------------------|---------------------------|-------------------------------|-------------------------|
| Branded Merchandise | 1.5 / 3.0 / 6.0 | 3.0 / 5.0 / 8.0 | 0.5 / 1.5 / 3.0 | 30 / 50 / 70 |
| Recruitment Services | 2.0 / 4.5 / 8.0 | 2.0 / 4.0 / 7.0 | 1.0 / 2.5 / 5.0 | 35 / 55 / 75 |
| Architecture Project Mgmt | 1.0 / 2.5 / 5.0 | 3.0 / 5.0 / 8.0 | 0.3 / 1.0 / 2.5 | 25 / 45 / 65 |
| B2B Lead Generation | 2.0 / 4.0 / 7.0 | 2.0 / 4.0 / 6.0 | 1.0 / 2.0 / 4.0 | 35 / 55 / 75 |
| Business Acquisitions | 1.5 / 3.5 / 6.5 | 2.5 / 4.5 / 7.0 | 0.5 / 1.5 / 3.5 | 30 / 50 / 70 |
| Umbrella Company Solutions | 1.5 / 3.0 / 5.5 | 2.5 / 4.5 / 7.0 | 0.5 / 1.5 / 3.0 | 30 / 50 / 70 |
| Default (unknown vertical) | 1.0 / 2.5 / 5.0 | 2.0 / 4.0 / 7.0 | 0.5 / 1.5 / 3.0 | 30 / 50 / 70 |

LinkedIn-specific (for workspaces with LinkedIn channels):
| Metric | Low | Avg | High |
|--------|-----|-----|------|
| Connection Accept Rate | 15 | 30 | 50 |
| Message Reply Rate | 5 | 15 | 30 |

Note: bounce rate is inverted (lower = better). The gauge should show green at the low end for bounce rate.

## Gauge Color Zone Breakpoints (Claude's Discretion)

- **Red zone:** value < `industry.low` (or > `industry.low` for inverted metrics)
- **Yellow zone:** value between `industry.low` and `industry.high`
- **Green zone:** value > `industry.high` (or < `industry.low` for inverted metrics)

The gauge should display a smooth gradient bar with three distinct color zones. The workspace's value is shown as a diamond marker, the global average as a thin solid line, and the industry average as a thin dashed line.

## Confidence Threshold Logic (Claude's Discretion)

For the ICP recommendation card:
- **High confidence:** 200+ people with ICP scores in the workspace
- **Medium confidence:** 100-199 people
- **Low confidence:** 50-99 people
- **No recommendation:** < 50 people (show "not enough data" message)

For signal effectiveness:
- **Meaningful data:** 10+ leads per signal type
- **Low confidence badge:** 5-9 leads per signal type
- **Not shown:** < 5 leads (hide signal type from ranking)

## Empty State Strategy (Claude's Discretion)

| Section | Empty Condition | Message |
|---------|----------------|---------|
| Reference Bands | No CachedMetrics rows | "No campaign data yet. Analytics snapshots will populate benchmarks automatically." |
| ICP Calibration | < 50 ICP-scored people in workspace | "Not enough ICP data for calibration. Score more leads to see correlations (need 50+, currently N)." |
| Signal Effectiveness | 0 signal campaigns | "No signal campaigns configured. Set up signal-triggered campaigns to track signal effectiveness." |
| Signal vs Static | 0 signal OR 0 static campaigns with data | "Need both signal and static campaigns with data to compare performance." |

## Open Questions

1. **Snapshot cron timing for benchmark computation**
   - What we know: The snapshot-metrics cron runs per workspace via cron-job.org. Currently 0 cached metrics exist.
   - What's unclear: Should benchmark aggregation happen at API request time (simpler but potentially slow) or be pre-computed by the cron?
   - Recommendation: Compute at API request time for now. With 8 workspaces and ~30 campaigns total, aggregation is fast. Can optimize to cron-based pre-computation later if needed.

2. **PersonWorkspace vs Person for ICP scores**
   - What we know: CONTEXT.md says "Person.icpScore" but the field is actually on PersonWorkspace. Person model has no icpScore field.
   - What's unclear: Whether this is an intentional simplification in CONTEXT.md or a mistake.
   - Recommendation: Use PersonWorkspace.icpScore (the actual data location). Per-workspace ICP makes sense since ICP criteria differ by vertical.

3. **Current threshold source for recommendation**
   - What we know: Campaign.icpScoreThreshold exists (default 70). Different signal campaigns can have different thresholds.
   - What's unclear: Which threshold to show as "current" when a workspace has multiple signal campaigns with different thresholds.
   - Recommendation: Use the most common threshold across the workspace's signal campaigns, or the default (70) if no signal campaigns exist.

## Sources

### Primary (HIGH confidence)
- Project Prisma schema (`prisma/schema.prisma`) -- all model definitions verified
- Existing analytics code (`src/lib/analytics/snapshot.ts`, `src/app/api/analytics/`) -- CachedMetrics patterns verified
- Production database queries -- data volumes confirmed (10 ICP scores, 2 replies, 0 signals, 0 cached metrics)

### Secondary (MEDIUM confidence)
- Industry benchmark values -- general cold email/outreach industry knowledge, not from a single authoritative source
- Gauge visualization approach -- based on common dashboard patterns

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used extensively in the project
- Architecture: HIGH -- follows exact patterns from Phase 24 and 25 (CachedMetrics, API routes, lazy-loading tabs)
- Pitfalls: HIGH -- verified against actual schema and production data
- Industry benchmarks: MEDIUM -- reasonable defaults but not from a single authoritative source
- Gauge visualization: HIGH -- straightforward CSS/SVG approach with Recharts for charts

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable -- no fast-moving dependencies)
