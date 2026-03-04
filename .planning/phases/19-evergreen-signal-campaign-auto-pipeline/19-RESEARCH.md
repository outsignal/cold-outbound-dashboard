# Phase 19: Evergreen Signal Campaign Auto-Pipeline - Research

**Researched:** 2026-03-04
**Domain:** Signal-to-Lead Pipeline, Campaign Lifecycle Extension, Async Processing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Campaign Creation Flow**
- Chat-based creation only — admin tells the Leads Agent what to create (ICP criteria, signal types, workspace)
- Campaign created as **draft** — admin reviews config before activating
- One workspace per campaign (matches static campaign model)
- ICP criteria stored as **structured fields** (industries, titles, company size, locations) — deterministic matching, not LLM re-interpretation

**Signal-to-Lead Pipeline**
- **Separate async processing** — signal worker writes SignalEvents only; a separate process matches signals to campaigns, discovers leads, and enriches
- Use **existing discovery adapters** (Apollo/Prospeo/AI Ark) to find people at signaled companies matching campaign ICP criteria
- **Configurable daily lead cap** per campaign (default 20 leads/day) — prevents flooding from spike events
- **Configurable ICP score threshold** per campaign (default 70/100) — below-threshold leads logged but not added to target list

**Approval & Deployment**
- **No human approval gate** for signal campaigns — leads that pass ICP scoring auto-deploy (overrides original success criterion #3)
- **Configurable channels per campaign** — admin specifies email, LinkedIn, or both when creating
- **Batch Slack notification** per processing cycle: "5 new leads added to Rise Signal Campaign from hiring spike signals" with lead list

**Campaign Lifecycle**
- **Graceful drain on pause** — finish processing leads already in pipeline, then stop matching new signals
- **Indefinite duration** — campaigns run until admin manually pauses or archives (true evergreen)
- **Campaign-level dedup** — track processed leads per campaign; same person from a new signal is skipped if already in this campaign
- Signals shown in dashboard alongside email and LinkedIn as a first-class channel; basic stats on campaign card (leads added, signals matched, status)

### Claude's Discretion
- Campaign status state machine (draft, active, paused, archived)
- Exact async processing architecture (cron vs queue vs triggered)
- How the Leads Agent extracts structured ICP criteria from natural language
- Error handling and retry logic for failed enrichments
- Audit trail storage format

### Deferred Ideas (OUT OF SCOPE)
- Dedicated signal monitoring page with detailed timeline — Phase 21 (Signal Dashboard)
- Cross-workspace signal campaign support — future consideration
- Campaign end dates / auto-expiry — not needed for evergreen model
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | Admin can create a signal campaign via chat specifying ICP criteria, signal types to monitor, and channel (email/LinkedIn/both) | Campaign Agent extended with new tool; ICP stored as structured JSON on Campaign model; signal type selection uses workspace signalEnabledTypes as valid set |
| PIPE-02 | Signal campaign setup requires content template approval (admin review + client dual approval in portal) before going live | NOTE: CONTEXT.md overrides this — no human approval gate. Content template still needed (auto-approved or pre-generated) before auto-deploy can fire |
| PIPE-03 | When a signal fires on a live campaign, leads at the matching company are auto-enriched via existing waterfall | Signal processor reads SignalEvent records, calls discovery adapters with company domain filter, feeds deduplicateAndPromote pipeline |
| PIPE-04 | Auto-enriched leads are ICP scored and added to the signal campaign's target list | scorePersonIcp() called per promoted lead; threshold check; addPeopleToList() called for passing leads |
| PIPE-05 | New leads auto-deploy to EmailBison/LinkedIn using the campaign's approved content template | executeDeploy() called for each qualifying lead (per-lead deploy, not batch); requires emailBisonCampaignId already provisioned |
| PIPE-06 | Admin receives Slack notification when leads are added to a signal campaign ("3 leads added to Rise Fintech Signals") | Batch notification after each processing cycle run; uses existing postMessage() / notifyDeploy() pattern |
| PIPE-07 | Signal campaigns have a daily lead cap (configurable per campaign) to prevent burst floods | dailyLeadCap field on Campaign model; processor checks count before adding more leads |
| PIPE-08 | Signal campaigns can be paused/resumed instantly by admin | Campaign status state machine extended with pause/resume; processor checks campaign status at cycle start |
| PIPE-09 | Static campaigns (one-off list build → copy → deploy) continue to work as before alongside signal campaigns | Signal campaign is a new Campaign.type value ("signal"); static campaigns are type="static" (or null); all existing code paths unchanged |
</phase_requirements>

---

## Summary

Phase 19 connects the Phase 18 signal monitoring infrastructure to the existing campaign and discovery pipeline. The core challenge is not any new external technology — everything needed already exists in the codebase. The work is architectural: extending the Campaign model with signal-campaign-specific fields, building an async signal processor that runs after each worker-signals cycle, and wiring the existing discovery/enrichment/ICP/deploy machinery into an automated pipeline.

The key architectural insight is that the signal processor is a second Railway cron job (or a step appended to worker-signals index.ts) that reads recently-written SignalEvents, matches them against active signal campaigns by workspace and signal type, discovers leads at signaled companies using the existing adapter pattern, promotes them, scores them, and auto-deploys passing leads to EmailBison/LinkedIn. The Campaign model needs ~8 new fields (type, icpCriteria JSON, signalTypes JSON, dailyLeadCap, icpScoreThreshold, signalCampaignListId, emailBisonTemplateId, lastSignalProcessedAt) and one new junction model for campaign-level dedup.

The most complex sub-problems are: (1) deciding where the signal processor runs (appending to worker-signals vs a new service), (2) per-lead EmailBison deploy for signal campaigns (vs the current batch deploy model), and (3) ensuring the Campaign Agent can create signal campaigns purely via chat with structured ICP extraction.

**Primary recommendation:** Extend Campaign model with signal-specific fields, create a new `processSignalCampaigns()` function that runs as a step in worker-signals/src/index.ts after runCycle(), and use the existing discovery adapters with companyDomains filter to find leads at signaled companies. Per-lead auto-deploy via a simplified EmailBisonClient.createLead() call that adds directly to an existing EB campaign (pre-provisioned when signal campaign goes active).

---

## Standard Stack

### Core (all already in project — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^6.19.2 | Campaign model extension, signal processor DB queries | Already the ORM |
| `ai` (Vercel AI SDK) | ^6.0.97 | Campaign Agent tool execution, structured output | Already used for all agents |
| `@ai-sdk/anthropic` | ^3.0.46 | Claude Sonnet for ICP criteria extraction in Campaign Agent | Already used |
| `zod` | ^4.3.6 (main) / ^3.24 (worker) | Schema validation for new Campaign fields | Already used everywhere — note version split |
| `@slack/web-api` | ^7.14.1 | Batch notification when leads added to campaign | Already in worker-signals |
| EmailBisonClient | internal | Per-lead deploy to EmailBison | Already exists in `src/lib/emailbison/client.ts` |

### No New Libraries Needed

The entire pipeline uses existing infrastructure:
- **Discovery**: Apollo/Prospeo/AI Ark adapters already built (Phase 16)
- **Enrichment**: `enqueueJob()` waterfall queue already built (Phase 17)
- **ICP scoring**: `scorePersonIcp()` already built (Phase 17)
- **Deployment**: `executeDeploy()` already built (Phase 13/14)
- **Notifications**: `postMessage()` / Slack already in worker-signals
- **Dedup**: `deduplicateAndPromote()` already built (Phase 17)

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure

```
prisma/
  schema.prisma                    # Campaign model extended + SignalCampaignLead junction

src/lib/agents/
  campaign.ts                      # Extended: createSignalCampaign tool, activateSignalCampaign tool

src/app/api/
  campaigns/[id]/signal-status/    # PATCH route: pause/resume signal campaigns
  workspaces/[slug]/campaigns/     # GET: list campaigns with type filter

worker-signals/src/
  signal-pipeline.ts               # NEW: processSignalCampaigns() — the core processor
  index.ts                         # MODIFIED: call processSignalCampaigns() after runCycle()
```

### Pattern 1: Signal Campaign as Campaign Type Extension

**What:** Signal campaigns are a `type` field on the existing `Campaign` model (`"static"` vs `"signal"`). No separate table. All existing Campaign queries, status transitions, and UI pages work unchanged.

**When to use:** When adding a new campaign variant that shares lifecycle (draft, active, paused), approval flows (portal), and deploy mechanics (EmailBison).

**Schema additions to Campaign:**
```typescript
// In prisma/schema.prisma — additions to Campaign model
model Campaign {
  // ... existing fields ...

  // --- Signal Campaign fields (Phase 19) ---
  type                String  @default("static") // "static" | "signal"

  // ICP criteria for signal campaigns (structured JSON, not LLM re-interpreted)
  // { industries: string[], titles: string[], companySizes: string[], locations: string[] }
  icpCriteria         String? // JSON

  // Which signal types trigger this campaign
  // Subset of workspace signalEnabledTypes (e.g. ["funding", "hiring_spike"])
  signalTypes         String? // JSON array

  // Daily lead cap — stops pipeline after N leads added per calendar day
  dailyLeadCap        Int     @default(20)

  // ICP score threshold — leads below this are logged but not added to list
  icpScoreThreshold   Int     @default(70)

  // Pre-provisioned EmailBison campaign ID for signal auto-deploy
  // Created when campaign transitions to "active" — leads added directly to this campaign
  signalEmailBisonCampaignId Int?

  // Timestamp of last signal processing run — used by processor to find new signals
  lastSignalProcessedAt DateTime?
}

// New junction: track which persons have been processed by a signal campaign (dedup)
model SignalCampaignLead {
  id         String   @id @default(cuid())
  campaignId String
  personId   String
  addedAt    DateTime @default(now())

  // Outcome: "added" (passed threshold), "below_threshold" (scored but failed), "enriching" (in progress)
  outcome    String   @default("added")

  // ICP score at time of evaluation
  icpScore   Int?

  // Which signal triggered this (SignalEvent ID)
  signalEventId String?
  companyDomain String?

  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@unique([campaignId, personId])
  @@index([campaignId, addedAt])
  @@index([personId])
}
```

### Pattern 2: Signal Processor as Worker-Signals Step

**What:** `processSignalCampaigns()` runs as a final step in `worker-signals/src/index.ts` after `runCycle()`. It reads SignalEvents written in the current cycle, matches them against active signal campaigns, discovers leads, and auto-deploys.

**When to use:** The signal processor must have access to the same DB state that runCycle() just wrote. Running it in the same process (worker-signals) avoids polling delays and eliminates a second cron service.

**Architecture:**

```typescript
// worker-signals/src/signal-pipeline.ts (new file)

/**
 * Process all active signal campaigns.
 *
 * Called after runCycle() completes. For each active signal campaign:
 * 1. Find recent SignalEvents matching campaign's signal types + workspace
 * 2. For each new signaled company domain:
 *    a. Discover people via existing adapters (Apollo with companyDomains filter)
 *    b. Dedup against SignalCampaignLead table
 *    c. Enrich via waterfall
 *    d. ICP score
 *    e. If score >= threshold AND daily cap not hit: add to campaign list + auto-deploy
 * 3. Send batch Slack notification
 * 4. Update campaign.lastSignalProcessedAt
 */
export async function processSignalCampaigns(): Promise<void> {
  const campaigns = await prisma.campaign.findMany({
    where: { type: "signal", status: "active" },
    include: { workspace: true },
  });

  for (const campaign of campaigns) {
    await processCampaign(campaign);
  }
}
```

**Key design decision (Claude's Discretion):** The processor runs synchronously within the worker process (not via API calls to Vercel), so it has direct Prisma access and doesn't face Vercel timeout limits. Discovery API calls happen in the worker process — these are the same adapters used by the Leads Agent but called directly (not through the agent framework).

### Pattern 3: Campaign Agent Tool — createSignalCampaign

**What:** A new tool on the Campaign Agent that creates signal campaigns from natural language via structured field extraction.

**ICP criteria extraction approach (Claude's Discretion):** Use `generateObject()` with a Zod schema to extract structured ICP criteria from the admin's natural language description. This is deterministic post-extraction — the LLM converts "SaaS companies, 50-200 employees, UK, decision makers" into `{ industries: ["SaaS", "Software"], companySizes: ["51-200"], locations: ["United Kingdom"], titles: ["CEO", "CTO", "COO", "Head of *"] }` once. After that, the pipeline uses these structured fields directly.

```typescript
// In Campaign Agent tools
createSignalCampaign: tool({
  description: "Create a signal campaign. Admin specifies: ICP criteria (industries, titles, company sizes, locations), signal types to watch, channels (email/LinkedIn/both), and daily lead cap.",
  inputSchema: z.object({
    workspaceSlug: z.string(),
    name: z.string(),
    icpDescription: z.string().describe("Natural language ICP description from admin"),
    signalTypes: z.array(z.enum(["job_change","funding","hiring_spike","tech_adoption","news","social_mention"])),
    channels: z.array(z.enum(["email","linkedin"])),
    dailyLeadCap: z.number().default(20),
    icpScoreThreshold: z.number().default(70),
  }),
  execute: async (params) => {
    // 1. Extract structured ICP from natural language using generateObject()
    const icpCriteria = await extractIcpCriteria(params.icpDescription);

    // 2. Validate signal types against workspace enabledModules
    // 3. Create Campaign with type="signal", status="draft"
    // 4. Return campaign for admin review
  },
}),
```

### Pattern 4: Per-Lead Auto-Deploy for Signal Campaigns

**What:** Unlike static campaigns (batch deploy), signal campaigns deploy one lead at a time as they're added. This requires pre-provisioning an EmailBison campaign when the signal campaign goes active, then calling `createLead()` for each qualifying person.

**Key insight from existing code:** `EmailBisonClient.createLead()` in `src/lib/emailbison/client.ts` creates leads directly in a campaign. The existing `deployEmailChannel()` in `deploy.ts` does exactly this (loop over leads, call `createLead()` for each). For signal campaigns, this happens one lead at a time rather than in a batch.

**Pre-provisioning flow:**
```typescript
// When signal campaign transitions from draft -> active:
// 1. Create EmailBison campaign with the campaign's name
// 2. Create sequence steps from campaign.emailSequence
// 3. Store emailBisonCampaignId as campaign.signalEmailBisonCampaignId
// 4. For LinkedIn: no pre-provisioning needed — enqueueAction() called per lead

// In signal processor, for each qualifying lead:
await ebClient.createLead({
  email: person.email,
  firstName: person.firstName,
  // ...
  campaignId: campaign.signalEmailBisonCampaignId,
});
```

### Pattern 5: Campaign Status State Machine for Signal Campaigns

**What (Claude's Discretion):** Signal campaigns use a simplified state machine compared to static campaigns:

```
draft → active (admin explicitly activates after reviewing config)
active → paused (admin pauses; processor checks status per cycle)
paused → active (instant resume)
active/paused → archived (soft delete, signals no longer processed)
```

Static campaigns keep their existing state machine unchanged (`draft → internal_review → pending_approval → approved → deployed → active → paused → completed`).

**VALID_TRANSITIONS extension:**
```typescript
// signal campaigns skip the approval flow entirely:
const SIGNAL_CAMPAIGN_TRANSITIONS: Record<string, string[]> = {
  draft: ["active"],
  active: ["paused", "archived"],
  paused: ["active", "archived"],
  archived: [],
};
```

**Graceful drain on pause (locked decision):** When paused, leads already in the enrichment/scoring queue complete. The processor checks `campaign.status === "active"` at the top of each campaign loop — if paused, it skips new signal matching but does not cancel in-flight enrichment jobs.

### Pattern 6: Daily Cap Enforcement

**What:** The processor tracks how many leads were added to a signal campaign today. If the cap is reached, it stops processing new signals for that campaign for the rest of the calendar day.

```typescript
// In processSignalCampaigns:
const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
const leadsAddedToday = await prisma.signalCampaignLead.count({
  where: {
    campaignId: campaign.id,
    addedAt: { gte: new Date(todayStr) },
    outcome: "added",
  },
});

if (leadsAddedToday >= campaign.dailyLeadCap) {
  console.log(`[Pipeline] Daily cap hit for campaign "${campaign.name}" (${leadsAddedToday}/${campaign.dailyLeadCap})`);
  continue; // Skip this campaign today
}

const remainingCapacity = campaign.dailyLeadCap - leadsAddedToday;
// Only process up to remainingCapacity leads in this cycle
```

### Pattern 7: Batch Slack Notification

**What:** After processing all campaigns in a cycle, send one Slack notification per campaign that had leads added.

```typescript
// After processSignalCampaigns():
if (newLeadsAdded > 0) {
  const leadList = addedLeads.slice(0, 5).map(p => `• ${p.firstName} ${p.lastName} at ${p.company}`).join("\n");
  await postMessage(
    workspace.slackChannelId,
    `[${workspace.name}] ${newLeadsAdded} new lead${newLeadsAdded === 1 ? "" : "s"} added to signal campaign "${campaign.name}"`,
    [/* Slack Block Kit blocks */]
  );
}
```

### Anti-Patterns to Avoid

- **Don't run signal processor as a separate Railway cron service**: Added operational complexity with no benefit. Append to worker-signals index.ts after runCycle(). Same Prisma connection, same cycle.
- **Don't LLM-re-interpret ICP per signal fire**: ICP criteria extracted once at campaign creation via generateObject(). Stored as structured JSON. Pipeline uses structured fields deterministically.
- **Don't batch-deploy signal campaigns like static ones**: Static deploy creates one EB campaign and pushes all leads at once. Signal campaigns need per-lead deploy into a pre-existing EB campaign.
- **Don't reuse Campaign.emailBisonCampaignId for signal campaigns**: That field is set by the batch deploy path and conflicts with signal campaign's pre-provisioned campaign. Use Campaign.signalEmailBisonCampaignId instead.
- **Don't put signal campaign creation in the Leads Agent**: It belongs in the Campaign Agent (creates campaigns) with orchestrator delegation. The Leads Agent handles lead pipeline, not campaign configuration.
- **Don't use the full runAgent() framework in the worker**: The signal processor runs in worker-signals and calls discovery adapters directly (not through agents). Agents are for interactive chat. Worker calls library functions directly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lead discovery at signaled company | Custom API calls | Existing Apollo/Prospeo/AI Ark adapters with `companyDomains` filter | Adapters handle pagination, error handling, cost tracking, staging |
| Email finding for discovered leads | Custom enrichment | `enqueueJob({ provider: "waterfall", entityIds })` | Full waterfall already built in Phase 17 |
| ICP scoring | Custom scoring | `scorePersonIcp(personId, workspaceSlug)` | Already built with Firecrawl + Claude Haiku |
| Deduplication against Person DB | Custom dedup | `deduplicateAndPromote(workspaceSlug, runIds)` | Three-leg dedup already built |
| Slack notification | Custom Slack | `postMessage(channelId, text, blocks)` from `src/lib/slack.ts` | Already used in worker-signals governor |
| EmailBison lead creation | Custom HTTP | `EmailBisonClient.createLead()` from `src/lib/emailbison/client.ts` | Already has retry wrapper in deploy.ts |
| Campaign-level dedup | Check PersonWorkspace | New `SignalCampaignLead` junction | PersonWorkspace tracks workspace-level membership; SignalCampaignLead tracks per-campaign membership for cross-campaign scenarios |
| ICP criteria extraction from natural language | Custom parser | `generateObject()` with Zod schema | Already the pattern for structured output in this codebase |

**Key insight:** Phase 19 is almost entirely wiring — connecting existing components in a new sequence. The campaign model extension + signal processor + Campaign Agent tool are the only truly new code. Everything else already exists.

---

## Common Pitfalls

### Pitfall 1: Zod Version Mismatch Between Main Project and Worker

**What goes wrong:** Main project uses Zod v4 (`^4.3.6`); worker-signals uses Zod v3 (`^3.24.0`). If signal processor code is added to worker-signals, it must use Zod v3 syntax. Zod v4 has breaking changes (different `.parse()` behavior on some types, `z.record()` key type argument required in v3).

**Why it happens:** worker-signals is a separate package with its own `node_modules`. The STATE.md confirms this: "[18-02 worker-signals]: Zod v3 used in worker-signals (not v4) — matches main project pattern from 17-02."

Wait — the STATE.md note says "matches main project pattern from 17-02" but the main project NOW has Zod v4. The worker was written to match what was the main project pattern at the time. The worker must stay on Zod v3.

**How to avoid:** Any new code in `worker-signals/src/` uses Zod v3 syntax only. Schema validation for new Campaign fields can use Zod v4 in the main project (Campaign Agent, API routes) and plain JSON parsing in the worker.

**Warning signs:** TypeScript errors about `z.record()` needing key type, or `.safeParse()` returning different shapes.

### Pitfall 2: Discovery Adapters Are Main-Project Only — Worker Can't Import Them

**What goes wrong:** The discovery adapters (`src/lib/discovery/adapters/apollo.ts` etc.) are in the Next.js main project. The worker-signals package is a separate Node.js service. The worker cannot `import { apolloAdapter } from "@/lib/discovery/adapters/apollo"`.

**Why it happens:** worker-signals has its own `tsconfig.json` and `package.json`. The `@/` alias points to the worker's `src/` not the main project's `src/`.

**How to avoid:** Two options:
1. **Option A (simpler):** The signal processor in the worker makes HTTP calls to the main project's API routes (`POST /api/agents/leads` or a new `POST /api/pipeline/process-signal-campaign`). The Vercel deployment handles the discovery. Worker triggers Vercel; Vercel runs the discovery.
2. **Option B (recommended):** Create a new API route in the main project (`POST /api/pipeline/signal-campaigns/process`) that the worker calls. This route runs `processSignalCampaigns()` which has access to all the discovery adapters, Prisma, ICP scorer, etc. The worker's job is purely to trigger it (HTTP POST) after runCycle() completes.

**Option B architectural flow:**
```
worker-signals/src/index.ts
  → runCycle()       (PredictLeads + Serper signals written to DB)
  → HTTP POST /api/pipeline/signal-campaigns/process (triggers main app)

src/app/api/pipeline/signal-campaigns/process/route.ts
  → processSignalCampaigns()  (reads SignalEvents, discovers leads, enriches, scores, deploys)
```

This is the correct architecture. The worker writes signals; the main app processes them.

**Warning signs:** TypeScript "Cannot find module '@/lib/...'" errors in worker-signals.

### Pitfall 3: Per-Lead Deploy Hits EmailBison Rate Limits

**What goes wrong:** Signal campaigns add leads one at a time. If a hiring spike signal fires for a company with 500 ICP-matching employees, the processor tries to create 500 EB leads in a tight loop (capped by dailyLeadCap but still potentially 20 rapid-fire API calls).

**Why it happens:** The existing `deployEmailChannel()` already has a 100ms delay between leads for exactly this reason. The signal processor needs the same throttle.

**How to avoid:** Apply the same 100ms delay pattern from `deployEmailChannel()`. The daily cap (default 20) limits total exposure, but the throttle prevents burst-rate issues.

### Pitfall 4: Enrichment Is Async — ICP Scoring Needs Enriched Data

**What goes wrong:** `deduplicateAndPromote()` promotes leads and enqueues enrichment, but enrichment is async (processed by the next cron run of `/api/cron/enrichment`). If the signal processor tries to ICP-score immediately after promote, the leads have no email/enrichment data yet and will score LOW confidence.

**Why it happens:** The enrichment queue (`EnrichmentJob`) is a DB-backed async queue. The signal processor runs once; it can't wait for enrichment.

**How to avoid (Claude's Discretion):** Two approaches:
1. **Deferred scoring:** Promote leads, skip ICP scoring in the same cycle. A separate cron job or the next cycle picks up promoted leads that don't have icpScoredAt, scores them, and then adds to the campaign list if they pass threshold.
2. **Discovery-time filtering:** Use the discovery adapter's built-in filters (Apollo/Prospeo support title, seniority, industry, company size filters) to pre-filter before promoting. Only promote people who match ICP structurally — enrichment fills in the email. ICP scoring can be skipped or done on available data (company + title is usually enough for 70+% confidence).

**Recommendation:** Approach 2 (discovery-time ICP pre-filtering via adapter filters). Use the campaign's structured `icpCriteria` (industries, titles, companySizes, locations) directly as Apollo/Prospeo filter parameters. This eliminates the async dependency on enrichment for ICP scoring. Score can be computed from title + company data returned by the adapter (no enrichment needed for basic ICP match). Store ICP score based on structural match.

### Pitfall 5: PIPE-02 Conflict with CONTEXT.md Override

**What goes wrong:** REQUIREMENTS.md PIPE-02 says "requires content template approval before going live" but CONTEXT.md overrides: "No human approval gate for signal campaigns — leads that pass ICP scoring auto-deploy."

**Resolution:** PIPE-02 means the campaign must have a content template (email sequence) set before it can go active. The admin creates the campaign via chat, the Writer Agent generates copy, admin reviews and approves internally, then the campaign transitions to `active`. There's no client portal approval gate. The "content template approval" in PIPE-02 is admin-side only, not portal-side.

**How to avoid:** In createSignalCampaign, after campaign creation, prompt admin: "Campaign created as draft. You'll need to generate copy for it before activating. Want me to generate an email sequence now?" Signal campaign cannot transition to `active` until `emailSequence` is set.

### Pitfall 6: Campaign-Level Dedup Must Handle Same Person Across Multiple Signals

**What goes wrong:** Company Acme raises funding (signal 1) → processor discovers and adds Jane Smith. Two weeks later, Acme announces a product launch (signal 2) → processor discovers Jane Smith again from Apollo → tries to add her again.

**Why it happens:** `SignalCampaignLead` must be checked before `deduplicateAndPromote()`. The `deduplicateAndPromote()` function handles Person-level dedup (is this person already in the Person table?) but not campaign-level dedup (is this person already in THIS campaign?).

**How to avoid:** Before calling discovery adapters, check `SignalCampaignLead` for recently promoted people from this campaign. After promotion, write `SignalCampaignLead` records immediately. The `@@unique([campaignId, personId])` constraint on `SignalCampaignLead` enforces this at DB level (upsert will no-op on conflict).

---

## Code Examples

Verified patterns from existing codebase:

### Existing: Discovery with Company Domain Filter (Apollo)

From `src/lib/agents/leads.ts` — Apollo adapter already accepts `companyDomains` filter:

```typescript
// Source: src/lib/agents/leads.ts lines 286-293
const result = await apolloAdapter.search(
  {
    jobTitles: params.jobTitles,
    seniority: params.seniority,
    industries: params.industries,
    companyDomains: [signalEvent.companyDomain], // TARGET: filter by signaled company
    companySizes: params.companySizes,
  },
  25, // limit
);
```

### Existing: ICP Scoring

From `src/lib/icp/scorer.ts`:

```typescript
// Source: src/lib/icp/scorer.ts
import { scorePersonIcp } from "@/lib/icp/scorer";

const result = await scorePersonIcp(personId, workspaceSlug);
// returns: { score: number, reasoning: string, confidence: "high"|"medium"|"low" }
```

### Existing: Enqueue Enrichment

From `src/lib/discovery/promotion.ts` line 217:

```typescript
// Source: src/lib/discovery/promotion.ts
import { enqueueJob } from "@/lib/enrichment/queue";

const jobId = await enqueueJob({
  entityType: "person",
  provider: "waterfall",
  entityIds: promotedIds,
  chunkSize: 25,
  workspaceSlug,
});
```

### Existing: Per-Lead EmailBison Deploy

From `src/lib/campaigns/deploy.ts` lines 163-176:

```typescript
// Source: src/lib/campaigns/deploy.ts
await withRetry(() =>
  ebClient.createLead({
    email: person.email,
    firstName: person.firstName ?? undefined,
    lastName: person.lastName ?? undefined,
    jobTitle: person.jobTitle ?? undefined,
    company: person.company ?? undefined,
  }),
);
// 100ms throttle between leads
await new Promise((resolve) => setTimeout(resolve, 100));
```

### Existing: Slack Notification from Worker

From `worker-signals/src/governor.ts` — alertBudgetCapHit pattern:

```typescript
// Source: worker-signals/src/governor.ts
import { WebClient } from "@slack/web-api";
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

await slack.chat.postMessage({
  channel: adminChannelId,
  text: `[${workspaceName}] X new leads added to signal campaign "${campaignName}"`,
  blocks: [/* Block Kit */],
});
```

### New: Structured ICP Extraction in Campaign Agent

```typescript
// Source: pattern from src/lib/agents/*.ts using generateObject()
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const icpSchema = z.object({
  industries: z.array(z.string()),
  titles: z.array(z.string()),
  companySizes: z.array(z.string()), // ["51-200", "201-500"]
  locations: z.array(z.string()),    // ["United Kingdom"]
  keywords: z.array(z.string()).optional(),
});

const { object: icpCriteria } = await generateObject({
  model: anthropic("claude-haiku-4-5"),
  schema: icpSchema,
  prompt: `Extract structured ICP criteria from: "${icpDescription}"`,
});
```

### New: Worker-to-Main-App HTTP Trigger

```typescript
// worker-signals/src/index.ts — after runCycle()
async function triggerSignalPipeline(): Promise<void> {
  const appUrl = process.env.MAIN_APP_URL; // "https://admin.outsignal.ai"
  const secret = process.env.PIPELINE_SECRET;

  const res = await fetch(`${appUrl}/api/pipeline/signal-campaigns/process`, {
    method: "POST",
    headers: {
      "x-pipeline-secret": secret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ triggeredAt: new Date().toISOString() }),
  });

  if (!res.ok) {
    console.error("[Pipeline] Failed to trigger signal campaign processor:", await res.text());
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual lead → list → campaign workflow | Signal-triggered auto-discovery + auto-deploy | Phase 19 | Admin only needs to configure campaign once |
| Batch deploy (all leads at campaign launch) | Per-lead deploy for signal campaigns | Phase 19 | Leads deploy as they're discovered, not in a batch |
| Static campaign only (one workspace type) | Static + Signal campaign types | Phase 19 | Campaign.type field differentiates behavior |

**Deprecated/outdated:**
- Original PIPE-02 portal approval gate: Overridden by CONTEXT.md decision — no client approval gate for signal campaigns. Content reviewed by admin internally only.

---

## Open Questions

1. **Where does signal processor authentication happen?**
   - What we know: The worker calls `POST /api/pipeline/signal-campaigns/process` on the main app.
   - What's unclear: Which secret/auth mechanism? The existing `x-api-key` pattern (CLAY_WEBHOOK_SECRET) or a new `PIPELINE_SECRET`?
   - Recommendation: Add a new `PIPELINE_INTERNAL_SECRET` env var. The route checks `x-pipeline-secret` header. Same pattern as the Clay webhook `x-api-key` check. Simple, consistent.

2. **What happens when enrichment is still running when ICP scoring is attempted?**
   - What we know: `deduplicateAndPromote()` enqueues enrichment as async. ICP scoring happens AFTER enrichment theoretically.
   - What's unclear: Should the signal processor wait? Should ICP scoring be deferred to a separate step?
   - Recommendation: Use discovery-time structural filtering (adapter filters for title/industry/company size = structural ICP pre-filter). ICP scoring via `scorePersonIcp()` can run immediately using title+company data from the adapter response. Store `icpScore` on `SignalCampaignLead`. Enrichment (email finding) runs async and is needed for deployment, not for scoring.

3. **Can the signal processor call `scorePersonIcp()` synchronously within the Vercel 30s timeout?**
   - What we know: `scorePersonIcp()` calls Firecrawl (homepage crawl) + Claude Haiku. Each call is ~2-5 seconds. With dailyLeadCap=20 leads, that's 40-100 seconds of scoring.
   - What's unclear: Will this blow the Vercel serverless function timeout?
   - Recommendation: Skip Firecrawl crawl for signal campaigns; score on available data (title + company + adapter-returned metadata). The adapter already returns company description/industry/size. Set `crawlMarkdown` to null (scorer handles this gracefully — falls back to company data only). Or: enqueue scoring as a separate async job and deploy only after scoring completes in the next cycle.

4. **How does the Campaign Agent display signal campaigns differently in the dashboard?**
   - What we know: Success criterion: "Signals shown in dashboard alongside email and LinkedIn as a first-class channel; basic stats on campaign card"
   - What's unclear: Is this a UI change to existing campaign cards or a new section?
   - Recommendation: Add a "Signals" channel badge to campaign cards that have `type="signal"`. Show stats: leads added (count from SignalCampaignLead), signals matched (count from SignalEvent matching campaign's workspace+types since lastSignalProcessedAt). This is read-only display — Phase 21 handles the dedicated signal dashboard.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in config.json (no such key) — skipping formal validation architecture.

No testing framework configuration changes needed. The project uses Vitest for unit tests.

**Phase 19 testing approach:** Manual integration testing after each plan. Key test scenarios:
1. Create signal campaign via chat → verify Campaign record has correct type/icpCriteria/signalTypes
2. Trigger signal pipeline endpoint manually → verify discovery + scoring + list addition
3. Verify daily cap stops after N leads
4. Verify pause blocks new signal matching (in-flight jobs drain)
5. Verify static campaign creation still works unchanged

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/lib/agents/campaign.ts` — Campaign Agent tools, current createCampaign flow
- Codebase: `src/lib/agents/leads.ts` — Discovery adapter calls, buildDiscoveryPlan, deduplicateAndPromote
- Codebase: `src/lib/campaigns/deploy.ts` — executeDeploy, deployEmailChannel, per-lead createLead pattern
- Codebase: `src/lib/discovery/promotion.ts` — deduplicateAndPromote full implementation
- Codebase: `src/lib/enrichment/queue.ts` — enqueueJob, processNextChunk
- Codebase: `src/lib/icp/scorer.ts` — scorePersonIcp interface
- Codebase: `prisma/schema.prisma` — Campaign model, TargetList, SignalEvent, all existing types
- Codebase: `worker-signals/src/cycle.ts` — runCycle architecture, adapter pattern
- Codebase: `worker-signals/src/workspaces.ts` — workspace config loading pattern
- Codebase: `worker-signals/package.json` — Zod v3 confirmed
- Codebase: `package.json` — Zod v4 in main project confirmed
- `.planning/STATE.md` — All accumulated decisions, especially Phase 18 decisions
- `.planning/phases/19-evergreen-signal-campaign-auto-pipeline/19-CONTEXT.md` — All locked decisions

### Secondary (MEDIUM confidence)

- STATE.md decision: "No auth guard on /api/workspaces/[slug]/signals — consistent with all other workspace routes" — pattern for new pipeline route

### Tertiary (LOW confidence)

- Vercel serverless timeout (30s) for signal processor — standard knowledge, not verified against current Vercel docs for this project's plan

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json and codebase
- Architecture: HIGH — all patterns traced to existing working code
- Pitfalls: HIGH — worker/main split verified in STATE.md, Zod version confirmed in package.json files, async enrichment issue verified in promotion.ts
- Open questions: MEDIUM — most are solvable, flagged for planner decision

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable codebase, 30-day window)
