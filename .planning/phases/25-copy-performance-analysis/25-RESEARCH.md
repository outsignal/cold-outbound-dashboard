# Phase 25: Copy Performance Analysis - Research

**Researched:** 2026-03-10
**Domain:** Email copy analysis, AI body element classification, multiplier-based correlation analytics
**Confidence:** HIGH

## Summary

Phase 25 adds copy performance analysis to the existing analytics page -- ranked subject lines with open/reply rates, AI-classified body structural elements, multiplier-based correlation cards with dual baselines (global + vertical), and a top-performing templates view. It builds directly on Phase 24's CachedMetrics infrastructure, snapshot cron, and analytics page.

The core technical challenge is the AI body element classification. Each email step needs to be classified for 6 structural elements (CTA type, problem statement, value proposition, case study, social proof, personalization) plus CTA subtypes. This classification should run during the daily snapshot cron (same pattern as copy strategy detection), storing results in CachedMetrics. The Reply model already captures `outboundSubject` and `outboundBody` on webhook receipt, and Campaign.emailSequence stores the full step-level email content. The correlation math is straightforward -- for each element, compute the average reply rate of emails containing it vs not containing it, then express as a multiplier.

**Primary recommendation:** Add body element classification to the snapshot cron, store element tags per campaign step in CachedMetrics, build 3 new API routes (subject-lines, correlations, top-templates), and add a "Copy" tab to the existing analytics page. Reuse all existing UI patterns (nuqs filters, recharts, workspace selector).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Both global and per-campaign views** for subject line ranking -- toggle between global ranking across all campaigns and per-campaign groupings
- **Metrics per subject line**: open rate, reply rate, total sends (volume for confidence)
- **Location**: "Copy" tab on existing `/admin/analytics` page -- keeps all analytics together
- **Minimum 10 sends** to include in rankings -- prevents noise from one-off tests
- **AI classification at snapshot time** -- classify body elements during the daily snapshot cron, same pattern as copy strategy detection
- **Per email step granularity** -- each step in a sequence gets its own element tags
- **Fixed 6 element types**: CTA type, problem statement, value proposition, case study, social proof, personalization
- **CTA subtypes**: `book_a_call`, `reply_to_email`, `visit_link`, `download_resource`
- **Multiplier cards** -- one card per element showing "2.1x more replies" or "0.5x fewer replies" vs baseline
- **Dual baselines** -- show global multiplier AND vertical-specific multiplier side by side
- **Vertical source**: use workspace's existing `vertical` field -- no new tagging needed
- **Confidence indicators** -- show sample size and dim/flag low-confidence correlations (< 20 samples)
- **Ranking criteria for top templates**: weighted by both reply rate AND interested rate -- high reply rate with low interested rate means objections not conversions. Minimum 10 sends threshold
- **Top 10 templates** shown, filterable by workspace and vertical (same filters as correlation view)
- **Detail view**: full email body text alongside tagged structural element pills

### Claude's Discretion
- Multiplier card visual design and color coding (green for positive, red for negative)
- AI classification prompt design for body elements
- Composite ranking formula for top templates (how to weight reply rate vs interested rate)
- Tab layout and switching behavior on the analytics page
- How to handle emails with no classifiable elements

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COPY-01 | Admin can see which subject lines produce the highest open and reply rates across campaigns | Reply.outboundSubject captured on webhook (note: currently 0 replies have outbound data due to low volume, but the capture mechanism exists). Campaign.emailSequence stores subjectLine per step. Aggregate from CachedMetrics snapshots that include step-level data. New API route `/api/analytics/copy/subject-lines` + subject line ranking table component. |
| COPY-02 | Each outbound email body is automatically analyzed for structural elements | AI classification via Anthropic Haiku (same pattern as strategy-detect.ts). Runs during snapshot cron. Results stored in CachedMetrics as new metric type `body_elements`. Campaign.emailSequence has body per step. 6 fixed elements + CTA subtypes classified in a single LLM call per step. |
| COPY-03 | Admin can see which body elements correlate with higher reply rates globally | Multiplier computation: avg reply rate of emails WITH element / avg reply rate of emails WITHOUT element. Computed server-side in a new `/api/analytics/copy/correlations` route. Multiplier cards component with confidence indicators. |
| COPY-04 | Admin can filter copy analysis by workspace and vertical | Workspace filter: existing pattern from analytics page (nuqs, workspace selector). Vertical filter: join through Workspace.vertical field (7 workspaces, 7 distinct verticals currently). All API routes accept `workspace` and `vertical` query params. |
| COPY-05 | Admin can view top-performing email templates with element breakdown | Composite score = weighted blend of reply rate and interested rate. Top 10 per filter. Detail view shows full body text + element pills. `/api/analytics/copy/top-templates` route. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.x | CachedMetrics queries, Campaign/Reply data | Already project ORM |
| @ai-sdk/anthropic | latest | Body element AI classification | Already used for strategy detection (strategy-detect.ts) |
| recharts | 2.x | Multiplier cards visualization, bar charts | Already installed, 11+ components use it |
| nuqs | latest | URL state for filters, tabs, sort | Already used on analytics page |
| Next.js API Routes | 16 | Copy analysis API endpoints | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | latest | Icons for element pills, confidence indicators | Already used throughout |
| zod | latest | API response validation | Already used throughout |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AI classification | Regex/keyword matching | Would miss nuanced elements like "problem statement" vs "value proposition". AI classification is consistent with the copyStrategy detection pattern already in the codebase |
| CachedMetrics storage | New dedicated model | CachedMetrics already handles metric caching with workspace+type+key+date uniqueness. No reason to add a new model |
| Multiplier cards | Bar chart comparison | Cards with multipliers are more immediately actionable than charts -- "2.1x" is clearer than comparing bar heights |

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
│   │   └── analytics/
│   │       └── copy/
│   │           ├── subject-lines/
│   │           │   └── route.ts          # GET: ranked subject lines with open/reply rates
│   │           ├── correlations/
│   │           │   └── route.ts          # GET: element-to-reply-rate multiplier cards
│   │           └── top-templates/
│   │               └── route.ts          # GET: top 10 performing email templates
│   └── (admin)/
│       └── analytics/
│           └── page.tsx                  # Add "Copy" tab to existing page
├── components/
│   └── analytics/
│       ├── copy-tab.tsx                  # Container for all copy analysis content
│       ├── subject-line-rankings.tsx     # Subject line table with toggle (global/per-campaign)
│       ├── element-multiplier-cards.tsx  # Multiplier cards grid with dual baselines
│       ├── top-templates-list.tsx        # Top 10 templates with element pills
│       └── template-detail-panel.tsx     # Expanded view: full body + element tags
└── lib/
    └── analytics/
        ├── snapshot.ts                   # (existing) Add body element classification call
        ├── strategy-detect.ts            # (existing) Unchanged
        └── body-elements.ts              # NEW: AI body element classification + correlation math
```

### Pattern 1: Body Element Classification
**What:** AI classifies email body text into structural elements
**When to use:** During daily snapshot cron, per email step per campaign

```typescript
// Single LLM call classifies all 6 elements + CTA subtype
// Returns a typed object, not free text
interface BodyElements {
  hasCtaType: boolean;
  ctaSubtype: "book_a_call" | "reply_to_email" | "visit_link" | "download_resource" | null;
  hasProblemStatement: boolean;
  hasValueProposition: boolean;
  hasCaseStudy: boolean;
  hasSocialProof: boolean;
  hasPersonalization: boolean;
}

// Stored in CachedMetrics:
// metricType: "body_elements"
// metricKey: `${campaignId}:step:${position}`
// data: JSON.stringify(BodyElements)
```

AI prompt should return JSON with boolean flags. Use Haiku for cost efficiency (same as strategy detection). Classify once per step, skip if already classified for the current campaign content.

### Pattern 2: Subject Line Aggregation
**What:** Aggregate subject lines across all campaigns with their performance metrics
**When to use:** `/api/analytics/copy/subject-lines` API route

Subject lines come from two sources:
1. **Campaign.emailSequence** -- each step has a `subjectLine` field (authoritative source for all campaigns)
2. **Reply.outboundSubject** -- captured per reply (currently sparse, useful for linking replies to specific subject lines)

The primary aggregation path: iterate CachedMetrics `campaign_snapshot` rows, parse `campaignName`, look up Campaign.emailSequence to get subject lines per step. Cross-reference with step-level reply counts from the snapshot's `stepStats` array.

For global view: deduplicate identical subject lines across campaigns, aggregate metrics.
For per-campaign view: group by campaign, show each step's subject line.

### Pattern 3: Multiplier Computation
**What:** For each body element, compute reply rate multiplier vs baseline
**When to use:** Correlation analysis API route

```typescript
// For each element:
// 1. Collect all campaign steps that HAVE the element -> compute their avg reply rate
// 2. Collect all campaign steps that DON'T have the element -> compute their avg reply rate
// 3. Multiplier = rate_with / rate_without

interface ElementCorrelation {
  element: string;           // "case_study", "personalization", etc.
  globalMultiplier: number;  // e.g. 2.1
  globalSampleWith: number;  // emails with this element
  globalSampleWithout: number;
  verticalMultiplier: number | null; // null if insufficient data
  verticalSampleWith: number;
  verticalSampleWithout: number;
  verticalName: string | null;
}
```

For vertical filtering: look up `Workspace.vertical` for the campaign's workspace. Group campaigns by vertical before computing multipliers.

### Pattern 4: CachedMetrics Storage for Body Elements
**What:** Store body element classifications alongside campaign snapshots
**When to use:** Snapshot cron, classification persistence

Two CachedMetrics entries per classified step:
1. `metricType: "body_elements"`, `metricKey: "{campaignId}:step:{position}"` -- the element tags
2. `metricType: "campaign_snapshot"` (existing) -- already has per-step reply counts

The correlation API joins these: for each campaign step, look up its body elements AND its reply metrics from the snapshot.

### Pattern 5: Tab Navigation on Analytics Page
**What:** Add "Copy" tab alongside existing "Performance" content
**When to use:** Analytics page layout

```typescript
// nuqs-based tab state
const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("performance"));

// Tab chips at top of page:
// [Performance] [Copy]
// Performance = existing content (strategy cards + campaign rankings)
// Copy = new content (subject lines + element correlations + top templates)
```

### Pattern 6: Composite Ranking for Top Templates
**What:** Weight reply rate and interested rate to rank templates
**When to use:** Top templates API route

```typescript
// Composite score that penalizes high-reply/low-interested (objection-heavy) campaigns
// Weight: 60% interested rate, 40% reply rate
// Rationale: interested rate is the actual conversion signal; reply rate alone can be misleading
const compositeScore = (interestedRate * 0.6) + (replyRate * 0.4);
```

### Anti-Patterns to Avoid
- **Re-classifying body elements on every API request**: Classification runs once in the cron. API reads from CachedMetrics. Never call LLM at request time.
- **Computing correlations client-side**: All multiplier math happens server-side. Frontend receives pre-computed multipliers.
- **Treating subject lines as unique by text alone**: Same subject line text in different campaigns/steps can have different performance. Track campaign+step context.
- **Ignoring low-sample-size correlations entirely**: Show them dimmed, not hidden. Emerging patterns are valuable even with < 20 samples.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Body element detection | Regex/keyword matching | AI classification (Anthropic Haiku) | Natural language understanding needed for nuanced elements like "problem statement" vs "value proposition" |
| Multiplier visualization | Custom SVG cards | Styled div cards with conditional colors | Simple enough to not need a charting library; recharts overkill for single numbers |
| Tab switching | Custom tab state | nuqs `parseAsString` with URL param | Consistent with existing filter pattern, supports deep linking |
| Workspace+vertical filtering | Custom filter logic | Extend existing AnalyticsFilters component | Same filter bar, add vertical dropdown |
| Rate calculations | Frontend math | Server-side in API route | Avoid division-by-zero in multiple places, consistent rounding |

**Key insight:** The body element classification is the only genuinely new technical challenge. Everything else -- API routes, CachedMetrics, filtering, UI components -- follows patterns already established in Phase 24.

## Common Pitfalls

### Pitfall 1: Subject Line Data Sparsity
**What goes wrong:** Very few Reply records have `outboundSubject` populated (currently 0 out of 2 replies)
**Why it happens:** Outbound snapshot capture depends on webhook receipt with sequence step matching. Polled replies only get outbound data for single-step campaigns.
**How to avoid:** Do NOT depend on Reply.outboundSubject for subject line rankings. Instead, use Campaign.emailSequence as the authoritative source -- each step has `subjectLine`. Cross-reference with CachedMetrics `stepStats` for reply counts per step. This gives subject line + reply count for every campaign step regardless of Reply record population.
**Warning signs:** Empty subject line rankings, "no data" state

### Pitfall 2: AI Classification Prompt Returns Bad JSON
**What goes wrong:** LLM returns malformed JSON or unexpected values
**Why it happens:** Even with structured prompts, LLMs occasionally produce invalid output
**How to avoid:** Parse with try/catch, validate against expected schema, fall back to "no elements detected" rather than failing the entire snapshot. Use `response_format` or strict JSON mode if available (check AI SDK support). At minimum: validate each boolean field exists, coerce strings to booleans, validate ctaSubtype against known values.
**Warning signs:** CachedMetrics rows with `body_elements` type but empty/null data

### Pitfall 3: Division by Zero in Multiplier Calculation
**What goes wrong:** If no emails lack an element (all emails have personalization), baseline is 0 -> division error
**Why it happens:** Common elements like personalization may appear in every email
**How to avoid:** Guard: if either sample (with or without) is 0, return `null` multiplier with explanation "insufficient comparison data". Show "Present in all emails" or "Not found in any emails" instead of a multiplier.
**Warning signs:** Infinity or NaN multipliers, missing cards

### Pitfall 4: Cron Timeout with AI Classification
**What goes wrong:** Adding AI classification to snapshot cron exceeds 30s cron-job.org timeout
**Why it happens:** Each step requires an LLM call (~1-2s per call). A workspace with 5 campaigns * 3 steps = 15 calls = 15-30s
**How to avoid:** Only classify steps that haven't been classified yet (check if `body_elements` CachedMetrics row already exists for that campaignId:step:position). Most campaigns are stable -- classify once, skip thereafter. Only new campaigns need classification. Also: the Vercel function has `maxDuration: 60`, so it's the cron-job.org response timeout (30s) that matters. Return 200 early if needed and let classification continue via Vercel background processing.
**Warning signs:** cron-job.org timeout errors, partially classified campaigns

### Pitfall 5: Vertical Filter Returns No Data
**What goes wrong:** Filtering by a specific vertical shows zero correlations
**Why it happens:** A vertical with only 1-2 campaigns and few replies can't produce meaningful correlations
**How to avoid:** Show a clear "insufficient data for [vertical] -- showing global data instead" message. Never show an empty correlations view without explanation. Consider falling back to global data with a note.
**Warning signs:** Empty multiplier cards after applying vertical filter

### Pitfall 6: Snapshot Data Inconsistency Between Step Metrics and Body Elements
**What goes wrong:** Body elements classified for step positions that don't match stepStats positions
**Why it happens:** Campaign.emailSequence positions (1, 2, 3) may not align with Reply.sequenceStep values if EmailBison uses different numbering
**How to avoid:** Always use the same position source. Use `Campaign.emailSequence[].position` as the canonical step identifier. Both body element classification and step metric aggregation should reference this.
**Warning signs:** Step 1 has element data but no reply data, or vice versa

## Code Examples

### Body Element Classification Prompt
```typescript
const BODY_ELEMENTS_PROMPT = `Analyze this cold email body and identify which structural elements are present.

Respond with ONLY valid JSON matching this exact schema:
{
  "hasCtaType": boolean,
  "ctaSubtype": "book_a_call" | "reply_to_email" | "visit_link" | "download_resource" | null,
  "hasProblemStatement": boolean,
  "hasValueProposition": boolean,
  "hasCaseStudy": boolean,
  "hasSocialProof": boolean,
  "hasPersonalization": boolean
}

Element definitions:
- CTA type: Any call-to-action asking the reader to take a specific action
  - book_a_call: Scheduling a meeting/call/demo
  - reply_to_email: Asking for a reply or response
  - visit_link: Clicking a link to a resource
  - download_resource: Downloading a PDF/guide/whitepaper
- Problem statement: Identifies a specific pain point or challenge the reader faces
- Value proposition: States a clear benefit or outcome the sender can deliver
- Case study: References a specific client result with numbers or named company
- Social proof: Mentions logos, client count, testimonials, awards, or industry recognition (broader than case study)
- Personalization: References something specific to the reader's company, role, industry, or recent activity

Email body:
{body}`;
```

### Body Element Classification Function
```typescript
// Pattern: matches strategy-detect.ts exactly
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export interface BodyElements {
  hasCtaType: boolean;
  ctaSubtype: "book_a_call" | "reply_to_email" | "visit_link" | "download_resource" | null;
  hasProblemStatement: boolean;
  hasValueProposition: boolean;
  hasCaseStudy: boolean;
  hasSocialProof: boolean;
  hasPersonalization: boolean;
}

const EMPTY_ELEMENTS: BodyElements = {
  hasCtaType: false, ctaSubtype: null,
  hasProblemStatement: false, hasValueProposition: false,
  hasCaseStudy: false, hasSocialProof: false, hasPersonalization: false,
};

export async function classifyBodyElements(emailBody: string): Promise<BodyElements> {
  if (!emailBody || emailBody.trim().length < 20) return EMPTY_ELEMENTS;

  const result = await generateText({
    model: anthropic("claude-haiku-4-5-20250315"),
    prompt: BODY_ELEMENTS_PROMPT.replace("{body}", emailBody),
  });

  try {
    const parsed = JSON.parse(result.text.trim());
    // Validate and coerce
    return {
      hasCtaType: Boolean(parsed.hasCtaType),
      ctaSubtype: ["book_a_call", "reply_to_email", "visit_link", "download_resource"].includes(parsed.ctaSubtype)
        ? parsed.ctaSubtype : null,
      hasProblemStatement: Boolean(parsed.hasProblemStatement),
      hasValueProposition: Boolean(parsed.hasValueProposition),
      hasCaseStudy: Boolean(parsed.hasCaseStudy),
      hasSocialProof: Boolean(parsed.hasSocialProof),
      hasPersonalization: Boolean(parsed.hasPersonalization),
    };
  } catch {
    console.error("[body-elements] Failed to parse LLM response:", result.text);
    return EMPTY_ELEMENTS;
  }
}
```

### Multiplier Computation Logic
```typescript
interface StepWithElements {
  campaignId: string;
  step: number;
  workspace: string;
  vertical: string | null;
  elements: BodyElements;
  replyRate: number;    // from campaign snapshot
  interestedRate: number;
  totalSent: number;
}

function computeMultiplier(
  steps: StepWithElements[],
  elementKey: keyof BodyElements,
  verticalFilter?: string,
): { multiplier: number | null; sampleWith: number; sampleWithout: number } {
  const filtered = verticalFilter
    ? steps.filter(s => s.vertical === verticalFilter)
    : steps;

  const withElement = filtered.filter(s => s.elements[elementKey] === true);
  const withoutElement = filtered.filter(s => s.elements[elementKey] !== true);

  if (withElement.length === 0 || withoutElement.length === 0) {
    return { multiplier: null, sampleWith: withElement.length, sampleWithout: withoutElement.length };
  }

  // Weighted average by total sent (not simple average -- campaigns with more sends should matter more)
  const avgWith = weightedAvg(withElement);
  const avgWithout = weightedAvg(withoutElement);

  if (avgWithout === 0) return { multiplier: null, sampleWith: withElement.length, sampleWithout: withoutElement.length };

  return {
    multiplier: Math.round((avgWith / avgWithout) * 10) / 10, // 1 decimal place
    sampleWith: withElement.length,
    sampleWithout: withoutElement.length,
  };
}

function weightedAvg(steps: StepWithElements[]): number {
  const totalSent = steps.reduce((sum, s) => sum + s.totalSent, 0);
  if (totalSent === 0) return 0;
  return steps.reduce((sum, s) => sum + (s.replyRate * s.totalSent), 0) / totalSent;
}
```

### CachedMetrics Storage for Body Elements
```typescript
// In snapshot cron: after classifying, store in CachedMetrics
await prisma.cachedMetrics.upsert({
  where: {
    workspace_metricType_metricKey_date: {
      workspace: workspaceSlug,
      metricType: "body_elements",
      metricKey: `${campaign.id}:step:${step.position}`,
      date: "", // Elements don't change daily -- use empty date (classified once)
    },
  },
  create: {
    workspace: workspaceSlug,
    metricType: "body_elements",
    metricKey: `${campaign.id}:step:${step.position}`,
    date: "",
    data: JSON.stringify(elements),
  },
  update: {
    data: JSON.stringify(elements),
    computedAt: new Date(),
  },
});
```

### Composite Score for Top Templates
```typescript
// 60% interested rate, 40% reply rate
// Penalizes high-reply-low-interested campaigns (objection magnets)
function compositeScore(replyRate: number, interestedRate: number): number {
  return Math.round(((interestedRate * 0.6) + (replyRate * 0.4)) * 100) / 100;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No body element tagging | AI classification at snapshot time | Phase 25 | Enables element-level copy insights |
| Single copy strategy per campaign | Per-step element breakdown | Phase 25 | Granular understanding of what works in each step |
| Flat campaign rankings | Subject line + element-level analysis | Phase 25 | Data-driven copy decisions |

**Key existing infrastructure leveraged:**
- `Campaign.emailSequence` JSON with `subjectLine` and `body` per step (1 campaign has data, more will accumulate)
- `CampaignSnapshot.stepStats` array with per-step reply counts
- `CachedMetrics` unique constraint `[workspace, metricType, metricKey, date]` supports new metric types
- `Workspace.vertical` field populated for all 7 workspaces (distinct values: Branded Merchandise, Recruitment Services, Architecture Project Management, B2B Lead Generation, Business Acquisitions, Umbrella Company Solutions, Paid Media Agency)
- `strategy-detect.ts` pattern for AI classification in snapshot cron
- Analytics page with nuqs-based filters and workspace selector
- `requireAdminAuth()` for API route protection

**Current data state:**
- 28 total campaigns, 1 with emailSequence data, 2 replies total (0 with outbound data)
- This is early-stage data. The system needs to be built to handle both current sparse data (graceful "insufficient data" states) and future growth

## Open Questions

1. **Content hash for re-classification detection**
   - What we know: Body elements should be classified once per step. If a campaign's email sequence is edited, the old classification becomes stale.
   - What's unclear: How often campaigns are edited after deployment (likely rare).
   - Recommendation: Store a hash of the email body alongside body_elements in CachedMetrics data JSON. On snapshot, compare hash -- if different, re-classify. Simple and robust.

2. **Step-level sent counts**
   - What we know: Per Phase 24 research, sent-per-step is not available from the local Reply table or EmailBison API step-level data.
   - What's unclear: Whether this matters for subject line open/reply rate calculations.
   - Recommendation: For subject line rankings, use campaign-level sent count as the denominator (all recipients see Step 1 subject line). For later steps, the sent count decreases (recipients who bounced/unsubscribed don't get step 2+), but we don't have step-level sent data. Show reply COUNT per step (which we have) rather than reply RATE per step. For overall subject line open/reply rates, use campaign-level metrics as approximation.

3. **A/B variant subject lines**
   - What we know: Campaign.emailSequence step has both `subjectLine` and `subjectVariantB` fields. EmailBison likely splits traffic between variants.
   - What's unclear: Whether we can attribute which reply came from which variant.
   - Recommendation: Show both variants as separate entries in subject line rankings. Note in UI that metrics are for the entire step (both variants combined). If EmailBison provides variant-level analytics in the future, can be enhanced.

## Sources

### Primary (HIGH confidence)
- Project schema: `prisma/schema.prisma` -- Reply model (outboundSubject, outboundBody), Campaign model (emailSequence, copyStrategy), CachedMetrics model, Workspace model (vertical)
- Existing snapshot: `src/lib/analytics/snapshot.ts` -- CampaignSnapshot interface, per-step stats aggregation, upsert pattern
- Existing strategy detect: `src/lib/analytics/strategy-detect.ts` -- AI classification pattern with Haiku, backfill loop
- Existing analytics API: `src/app/api/analytics/campaigns/route.ts` -- CachedMetrics query pattern, date range, sorting, 10-send minimum
- Existing analytics page: `src/app/(admin)/analytics/page.tsx` -- nuqs state, fetch pattern, section layout
- DB query: 7 workspaces all have vertical field populated. 28 campaigns, 1 with emailSequence data. 2 replies, 0 with outbound data.
- Webhook handler: `src/app/api/webhooks/emailbison/route.ts` -- outboundSubject/outboundBody capture from emailSequence step matching

### Secondary (MEDIUM confidence)
- Campaign emailSequence structure: confirmed via DB query -- keys are `position`, `subjectLine`, `subjectVariantB`, `body`, `delayDays`, `notes`
- AI SDK generateText pattern: confirmed working in strategy-detect.ts with `anthropic("claude-haiku-4-5-20250315")`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, no new dependencies
- Architecture: HIGH -- follows exact patterns from Phase 24 (cron extension, CachedMetrics, API routes, analytics page)
- AI classification: HIGH -- same pattern as strategy-detect.ts, Haiku model proven to work
- Correlation math: HIGH -- straightforward weighted average computation
- Pitfalls: HIGH -- identified from direct code inspection and data state queries

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable -- all internal project patterns, no external API changes expected)
