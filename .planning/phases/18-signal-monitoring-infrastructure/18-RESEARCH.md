# Phase 18: Signal Monitoring Infrastructure - Research

**Researched:** 2026-03-04
**Domain:** Background worker scheduling, PredictLeads API, Serper social listening, Prisma schema design
**Confidence:** MEDIUM — PredictLeads API specifics require trial account verification; everything else is HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Signal polling & scheduling**
- Poll every 6 hours (4 cycles/day) — balances freshness vs API cost
- Hybrid monitoring: criteria-based feed for broad signal discovery (e.g., "all funding rounds in fintech") AND domain-based watchlist for ABM account monitoring
- Criteria-based signals are defined per signal campaign (Phase 19 creates campaigns, Phase 18 builds the infrastructure to execute them)
- Domain-based watchlist for specific high-value accounts to track closely
- Serper social listening runs in the same cycle, after PredictLeads completes — single worker process
- Worker deduplicates domains/criteria across workspaces, polls once, fans out SignalEvents to relevant workspaces

**Signal event data model**
- Store source name (predictleads/serper), full raw API response as JSON, and confidence score on each SignalEvent
- Multi-signal stacking: 2+ distinct signal types on the same company within rolling 30 days = high intent flag
- 90-day TTL on signals — older signals marked expired, excluded from stacking and campaign matching, kept in DB for history
- companyDomain soft link (no FK) — consistent with Person.companyDomain pattern

**Budget governor behavior**
- Hard stop + Slack alert when daily cap hit — stop processing for that workspace AND notify admin
- Default daily cap: $5/day per workspace — admin can increase per workspace in settings
- When cap hit mid-cycle, skip remaining items for that workspace, resume next 6-hour cycle
- Daily cap resets at midnight UTC

**PredictLeads vs Serper scope**
- Per-workspace signal type selection — admin picks which of the 5 PredictLeads types to monitor (job changes, funding, hiring spikes, tech adoption, news)
- PredictLeads pricing confirmed: $0.04/call (101-5k), $0.02 (5k-10k), $0.01 (10k+), $40/month minimum — affordable, build for paid tier
- Serper social listening uses competitor brand mention strategy — search Reddit/Twitter for competitor names + frustration keywords ("switching from", "alternative to")
- Competitor names configured per workspace in settings — different clients have different competitors

### Claude's Discretion
- Exact PredictLeads API integration (endpoints, auth, pagination, response parsing)
- Domain processing order within a cycle (for fair coverage when budget caps hit mid-cycle)
- Social listening dedup (avoid re-processing same Reddit/Twitter posts across cycles)
- Error handling when PredictLeads or Serper APIs fail mid-cycle
- SignalEvent Prisma model field names and types beyond the specified metadata

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SIG-01 | PredictLeads integration detects job changes at ICP-matching companies | PredictLeads Job Openings Dataset endpoint; "Retrieve company's Job Openings" GET endpoint; domain-based lookup |
| SIG-02 | PredictLeads integration detects funding rounds at ICP-matching companies | PredictLeads Financing Events Dataset endpoint; "Retrieve company's Financing Events" GET endpoint |
| SIG-03 | PredictLeads integration detects hiring spikes (unusual job posting volume) | Job Openings count comparison vs baseline; volume threshold detection using historical data |
| SIG-04 | PredictLeads integration detects technology adoption changes | Technology Detections dataset; "Retrieve Technologies used by specific Company" GET endpoint |
| SIG-05 | PredictLeads integration detects company news events | News Events Dataset; "Retrieve company's News Events" GET endpoint |
| SIG-06 | Serper.dev social listening detects competitor mentions on Reddit/Twitter | Existing `serperAdapter.searchSocial()` method; URL dedup via SeenSignalUrl model; per-workspace competitor list |
| SIG-07 | Signal monitoring runs as Railway background worker (cron every 4-6 hours) | Existing `worker/` directory pattern; Railway cron service that exits after each run; 5-min minimum interval constraint |
| SIG-08 | SignalEvent model stores every detected signal with sufficient metadata | New `SignalEvent` Prisma model with type, companyDomain, workspaceSlug, source, rawResponse, confidence, metadata |
| SIG-09 | Signal-level budget governor prevents cost explosion (configurable daily cap per workspace) | New `SignalDailyCost` model (parallel to existing `DailyCostTotal`); per-workspace cap stored on `Workspace` model |
| SIG-10 | Multi-signal stacking detection (2+ signals on same company = high intent flag) | Rolling 30-day window query on SignalEvent; `isHighIntent` flag set when count >= 2 distinct types |
</phase_requirements>

---

## Summary

Phase 18 builds a Railway background worker that polls PredictLeads and Serper.dev on a 6-hour cron schedule, writes SignalEvent records to Postgres, enforces per-workspace daily budget caps, and detects multi-signal high-intent companies.

The project already has a complete Railway worker pattern in the `worker/` directory (the LinkedIn worker). The signal worker will be a separate Railway service — same pattern (TypeScript, Dockerfile, railway.toml), but implemented as a Railway Cron Job rather than a persistent process. Railway cron services must exit after completing their task; the 6-hour schedule (`0 */6 * * *`) is well above Railway's 5-minute minimum constraint.

PredictLeads API documentation is confirmed to exist with separate endpoints per dataset (Job Openings, Financing Events, News Events, Technology Detections). Authentication uses dual-header auth (`X-Api-Key` + `X-Api-Token`) OR query params (`api_token` + `api_key`). Specific endpoint URL paths and response schemas require trial account access to verify in full — this is the key LOW confidence area. The architecture should be built with an abstraction layer (one function per signal type) that is easy to adjust once the API is live.

The existing enrichment cost tracking system (`DailyCostTotal`, `incrementDailySpend`, `checkDailyCap`) covers global enrichment costs. Signal monitoring needs its own per-workspace cost model (`SignalDailyCost`) since the constraint is "per workspace, per day" — fundamentally different from the single-tenant global cap.

**Primary recommendation:** Build the signal worker as a new Railway Cron service in `worker-signals/` (parallel to `worker/`), with a PredictLeads adapter abstraction and per-workspace budget governor. Keep the Prisma schema additions minimal: `SignalEvent`, `SignalDailyCost`, and add fields to `Workspace` for per-workspace config (budget cap, competitor names, enabled signal types).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript (tsx/tsc) | `^5` (matches project) | Worker language | Consistent with existing `worker/` |
| `@prisma/client` | `^6.19.2` (matches project) | DB access for reading workspace config, writing SignalEvents | Already used in worker (via API calls to main app); for signal worker, direct DB access is better than API round-trips |
| `node-fetch` / native `fetch` | Node 22 built-in | PredictLeads + Serper HTTP calls | Node 22 has stable native fetch |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^4.3.6` (matches project) | Validate PredictLeads API responses | Parse and safely type-check API responses before writing to DB |
| `@slack/web-api` | `^7.14.1` (matches project) | Budget cap Slack alerts | Reuse existing project pattern from `src/lib/slack.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct DB access from worker | REST API calls back to main Next.js app (like LinkedIn worker) | Direct DB is simpler for a read-heavy worker; avoids network round-trips; LinkedIn worker uses API because it needs the main app's business logic (session management, health updates) |
| Railway Cron service (exits after run) | Persistent worker with `setInterval` | Railway Cron is purpose-built for scheduled jobs; persistent worker risks skipping cycles if previous run is still alive |

**Installation (worker-signals package.json):**
```bash
npm install @prisma/client zod @slack/web-api
npm install -D typescript @types/node tsx
```

---

## Architecture Patterns

### Recommended Project Structure
```
worker-signals/
├── src/
│   ├── index.ts              # Entry point — runs cycle and calls process.exit(0)
│   ├── cycle.ts              # Orchestrates one full poll cycle
│   ├── predictleads/
│   │   ├── client.ts         # Low-level HTTP client (auth, rate limit, retry)
│   │   ├── job-openings.ts   # Fetch job openings for a domain
│   │   ├── financing.ts      # Fetch financing events for a domain
│   │   ├── news.ts           # Fetch news events for a domain
│   │   ├── technology.ts     # Fetch tech detections for a domain
│   │   └── types.ts          # Zod schemas + TS types for all responses
│   ├── serper/
│   │   └── social.ts         # Wrapper around serperAdapter.searchSocial() (copied/imported)
│   ├── governor.ts           # Per-workspace budget cap check + increment + Slack alert
│   ├── dedup.ts              # Social listening URL dedup (SeenSignalUrl tracking)
│   ├── signals.ts            # Write SignalEvent records; detect high-intent stacking
│   └── workspaces.ts         # Load workspace config from DB (domains, competitors, enabled types)
├── package.json
├── tsconfig.json
├── Dockerfile
└── railway.toml
```

### Pattern 1: Railway Cron Worker (Exit After Run)

**What:** A Node.js process that runs once and calls `process.exit(0)` when done. Railway Cron triggers it on schedule.

**When to use:** Any scheduled background job on Railway (signal polling, cleanup, etc.)

**Critical constraint:** The process MUST exit after completing. If it stays alive, Railway skips the next scheduled execution.

**Example:**
```typescript
// worker-signals/src/index.ts
import { runCycle } from "./cycle.js";

async function main() {
  console.log(`[SignalWorker] Starting cycle at ${new Date().toISOString()}`);
  try {
    await runCycle();
    console.log(`[SignalWorker] Cycle complete`);
    process.exit(0);
  } catch (error) {
    console.error(`[SignalWorker] Fatal error:`, error);
    process.exit(1);
  }
}

main();
```

**railway.toml for cron:**
```toml
[deploy]
cronSchedule = "0 */6 * * *"   # Every 6 hours at :00 UTC
```

### Pattern 2: Per-Workspace Budget Governor

**What:** Before processing each domain for a workspace, check if that workspace has hit its daily cap. If yes, skip and log. When cap is hit, fire a Slack alert.

**When to use:** Every API call that costs money (PredictLeads, Serper searches).

**Example:**
```typescript
// governor.ts
import { prisma } from "./db.js";

export async function checkWorkspaceCap(workspaceSlug: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" UTC
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { signalDailyCapUsd: true },
  });
  const cap = workspace?.signalDailyCapUsd ?? 5.0;
  const record = await prisma.signalDailyCost.findUnique({
    where: { workspaceSlug_date: { workspaceSlug, date: today } },
  });
  return (record?.totalUsd ?? 0) >= cap;
}

export async function incrementWorkspaceSpend(
  workspaceSlug: string,
  costUsd: number,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await prisma.signalDailyCost.upsert({
    where: { workspaceSlug_date: { workspaceSlug, date: today } },
    update: { totalUsd: { increment: costUsd } },
    create: { workspaceSlug, date: today, totalUsd: costUsd },
  });
}
```

### Pattern 3: Fan-Out — Poll Once, Write to Multiple Workspaces

**What:** When multiple workspaces monitor the same company domain, the worker calls PredictLeads once and creates one `SignalEvent` per workspace.

**When to use:** Domain deduplication across workspaces before polling.

**Example:**
```typescript
// cycle.ts — domain dedup
const allDomains = await loadAllWatchlistDomains(); // { domain, workspaceSlugs[] }[]

// Deduplicated: each domain polled once
for (const { domain, workspaceSlugs } of allDomains) {
  const signals = await fetchSignalsForDomain(domain); // single PredictLeads call
  for (const workspaceSlug of workspaceSlugs) {
    if (await checkWorkspaceCap(workspaceSlug)) continue; // skip this workspace
    await writeSignalEvents(signals, workspaceSlug);
    await incrementWorkspaceSpend(workspaceSlug, signals.costUsd);
  }
}
```

### Pattern 4: Social Listening Dedup (Serper)

**What:** Serper returns search results (URLs) that may repeat across cycles. Track seen URLs in DB to avoid creating duplicate SignalEvents for the same Reddit post.

**Why needed:** Serper returns Google search results — the same Reddit thread can appear across multiple weekly cycles.

**Example:**
```typescript
// dedup.ts
export async function isSeenSocialUrl(url: string): Promise<boolean> {
  const record = await prisma.seenSignalUrl.findUnique({ where: { url } });
  return !!record;
}

export async function markSocialUrlSeen(url: string): Promise<void> {
  await prisma.seenSignalUrl.upsert({
    where: { url },
    update: {},
    create: { url, seenAt: new Date() },
  });
}
```

### Pattern 5: Multi-Signal Stacking Detection

**What:** After writing a new SignalEvent, check if this company now has 2+ distinct signal types in the rolling 30-day window. If so, set `isHighIntent: true` on all signals for this company.

**Example:**
```typescript
// signals.ts
async function checkAndFlagHighIntent(companyDomain: string, workspaceSlug: string): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentSignals = await prisma.signalEvent.findMany({
    where: {
      companyDomain,
      workspaceSlug,
      status: "active",
      detectedAt: { gte: thirtyDaysAgo },
    },
    select: { signalType: true },
  });
  const distinctTypes = new Set(recentSignals.map((s) => s.signalType));
  if (distinctTypes.size >= 2) {
    await prisma.signalEvent.updateMany({
      where: { companyDomain, workspaceSlug, status: "active" },
      data: { isHighIntent: true },
    });
  }
}
```

### Anti-Patterns to Avoid

- **Persistent process with setInterval:** A Railway Cron service must exit. Using `setInterval` instead of `process.exit(0)` causes Railway to skip subsequent scheduled runs.
- **Per-call PredictLeads without domain dedup:** Calling PredictLeads once per workspace per domain instead of once per unique domain burns budget proportionally to workspace count.
- **Storing PredictLeads signals to the global `DailyCostTotal`:** Signal costs must be tracked separately per workspace. The existing `DailyCostTotal` is global (all enrichment costs) — mixing signal costs in would break the signal budget governor.
- **Writing SignalEvents without TTL:** Without the 90-day TTL, the stacking window query grows unbounded. Set status to "expired" at 90 days in a cleanup step (or via cron).
- **Fetching ALL PredictLeads data for a domain on each cycle:** Use the `first_seen_at` or `updated_at` filter to request only records newer than the last poll. Avoids re-processing old signals and reduces cost.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP retry with backoff for PredictLeads | Custom retry loop | Reuse existing pattern from `src/lib/enrichment/waterfall.ts` (exponential backoff, 429 handling, max 3 retries) | Already handles timeouts, 429s, and backoff correctly |
| Slack alert for budget cap | Custom Slack HTTP client | `postMessage()` from `src/lib/slack.ts` (importable or copied) | Existing implementation handles token auth, block kit |
| "Today UTC" date calculation | `new Date().toLocaleDateString()` | `new Date().toISOString().slice(0, 10)` | Exact same pattern as `todayUtc()` in `src/lib/enrichment/costs.ts` |
| Per-workspace DB upsert | Manual insert + update | Prisma `upsert` with `@@unique([workspaceSlug, date])` composite key | One call, atomic |

**Key insight:** The enrichment cost/cap system (`src/lib/enrichment/costs.ts`, `queue.ts`) is the direct template for the signal budget system. Almost all patterns copy over with workspace-scoped modifications.

---

## Common Pitfalls

### Pitfall 1: Railway Cron Job Doesn't Exit
**What goes wrong:** Worker keeps running after processing (open DB connections, timers, event listeners). Railway's next scheduled run is skipped because previous is still active.
**Why it happens:** Prisma client holds connection pool open; async event emitters stay alive.
**How to avoid:** Call `await prisma.$disconnect()` then `process.exit(0)` at the end of `main()`. Never use `setInterval` or persistent HTTP servers in a cron service.
**Warning signs:** Railway logs show previous execution still running when next schedule fires; logs show "skipped" or missing cycle runs.

### Pitfall 2: PredictLeads Duplicate Signals Per Cycle
**What goes wrong:** Each 6-hour cycle re-fetches all historical signals for a domain, creating duplicate `SignalEvent` records.
**Why it happens:** PredictLeads endpoints return all signals for a company, not just new ones since last poll.
**How to avoid:** Either (a) filter by `first_seen_at` query param for signals newer than 6 hours ago, or (b) use an `externalId` unique constraint on `SignalEvent` (PredictLeads signal ID) to use `upsert` instead of `create`. Both approaches work — (b) is more robust against missed cycles.
**Warning signs:** `SignalEvent` count growing faster than expected; duplicate records for same company + type + timestamp.

### Pitfall 3: Budget Cap Not Scoped to Workspace
**What goes wrong:** Using the global `DailyCostTotal` (used for enrichment) for signal costs. One workspace's signal activity blocks another workspace's enrichment budget.
**Why it happens:** Developer reuses existing cost system without reading the scope.
**How to avoid:** New `SignalDailyCost` model with `workspaceSlug` + `date` composite unique key. Completely separate from `DailyCostTotal`.
**Warning signs:** Enrichment jobs pausing when signal budget caps hit.

### Pitfall 4: Workspace Config Loaded Per-Domain Instead of Once Per Cycle
**What goes wrong:** Loading workspace `signalTypes`, `competitors`, `signalDailyCapUsd` from DB inside the per-domain loop. N+1 query pattern.
**Why it happens:** Convenience of loading config "when needed".
**How to avoid:** Load all workspace configs once at the start of `runCycle()`, build a lookup map.
**Warning signs:** Cycle duration scales with number of workspaces × domains.

### Pitfall 5: Serper Social Listening Without Dedup
**What goes wrong:** Same Reddit thread re-processed every 6 hours because Google keeps returning it. Duplicate `SignalEvent` records created.
**Why it happens:** Serper returns organic search results — popular posts stay indexed for weeks/months.
**How to avoid:** `SeenSignalUrl` table with `url` unique index. Check before writing; mark as seen after writing.
**Warning signs:** Same URL appearing in SignalEvents with different timestamps days apart.

### Pitfall 6: 90-Day TTL Never Cleaned Up
**What goes wrong:** `status: "active"` signals accumulate indefinitely. Stacking window queries become expensive. Old signals trigger false high-intent flags.
**Why it happens:** TTL is set in requirements but never implemented as a cleanup step.
**How to avoid:** Run a cleanup query at the start of each cycle: `updateMany` where `detectedAt < 90 days ago AND status = "active"` → `status = "expired"`. Fast because `detectedAt` is indexed.
**Warning signs:** SignalEvent table grows linearly with no leveling off; stacking detection includes signals from 4+ months ago.

---

## Code Examples

Verified patterns from existing codebase:

### Prisma Upsert with Composite Unique Key (from costs.ts pattern)
```typescript
// Source: src/lib/enrichment/costs.ts — adapted for per-workspace signal costs
await prisma.signalDailyCost.upsert({
  where: { workspaceSlug_date: { workspaceSlug, date: todayUtc() } },
  update: { totalUsd: { increment: costUsd } },
  create: { workspaceSlug, date: todayUtc(), totalUsd: costUsd },
});
```

### Slack Budget Alert (from src/lib/slack.ts postMessage pattern)
```typescript
// Source: src/lib/slack.ts + src/lib/notifications.ts pattern
import { postMessage } from "../../src/lib/slack.js"; // or copied to worker-signals

await postMessage(ADMIN_SLACK_CHANNEL_ID, `[${workspaceName}] Signal budget cap hit`, [
  {
    type: "header",
    text: { type: "plain_text", text: `[${workspaceName}] Signal daily budget cap reached` },
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Workspace:* ${workspaceName}\n*Daily cap:* $${cap}\n*Spent today:* $${spent}\n\nSignal processing paused until midnight UTC.`,
    },
  },
]);
```

### PredictLeads HTTP Client (auth pattern from blog post + swagger)
```typescript
// Source: MEDIUM confidence — based on blog.predictleads.com + swagger API structure
const BASE_URL = "https://predictleads.com/api/v3";

async function predictLeadsGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-Api-Key": process.env.PREDICTLEADS_API_KEY!,
      "X-Api-Token": process.env.PREDICTLEADS_API_TOKEN!,
    },
  });
  if (!res.ok) throw new Error(`PredictLeads ${res.status}: ${path}`);
  return res.json();
}

// Example endpoint shapes (MEDIUM confidence — requires verification against live API):
// GET /companies/{company_id}/job_openings?first_seen_at_from={ISO_date}
// GET /companies/{company_id}/news_events?first_seen_at_from={ISO_date}
// GET /companies/{company_id}/financing_events
// GET /companies/{company_id}/technology_detections
// GET /companies?website_url={domain}  — resolve domain to company_id
// POST /follow_companies  — add domain to watchlist
```

### SignalEvent Prisma Schema (recommended model)
```prisma
// To be added to prisma/schema.prisma
model SignalEvent {
  id            String   @id @default(cuid())

  // Signal identity
  signalType    String   // "job_change" | "funding" | "hiring_spike" | "tech_adoption" | "news" | "social_mention"
  source        String   // "predictleads" | "serper"
  externalId    String?  // Provider's signal ID (for dedup via upsert)

  // Company (soft link — consistent with Person.companyDomain pattern)
  companyDomain String
  companyName   String?  // Denormalized for display without extra DB lookup

  // Workspace
  workspaceSlug String

  // Signal data
  title         String?  // Human-readable signal summary
  summary       String?  // Extended description
  confidence    Float?   // 0-1 confidence score from provider
  sourceUrl     String?  // Original article/post URL (for social)

  // Raw data for audit/reconstruction (SIG-08 requirement)
  rawResponse   String   // JSON — full API response from provider
  metadata      String?  // JSON — extra structured data (funding amount, tech name, etc.)

  // Multi-signal stacking
  isHighIntent  Boolean  @default(false)  // True when 2+ distinct types on company within 30 days

  // Lifecycle
  status        String   @default("active")  // "active" | "expired"
  detectedAt    DateTime @default(now())
  expiresAt     DateTime // Set to detectedAt + 90 days on create

  @@unique([source, externalId])  // Prevent duplicate signals from same provider
  @@index([companyDomain, workspaceSlug, status])
  @@index([workspaceSlug, detectedAt])
  @@index([detectedAt])
  @@index([expiresAt, status])  // For 90-day TTL cleanup query
}

model SignalDailyCost {
  id            String   @id @default(cuid())
  workspaceSlug String
  date          String   // "YYYY-MM-DD" UTC
  totalUsd      Float    @default(0)
  breakdown     String?  // JSON — per-signal-type breakdown
  updatedAt     DateTime @updatedAt

  @@unique([workspaceSlug, date])  // workspaceSlug_date composite key for upsert
  @@index([workspaceSlug, date])
}

model SeenSignalUrl {
  id      String   @id @default(cuid())
  url     String   @unique  // Full URL of seen social post
  seenAt  DateTime @default(now())

  @@index([seenAt])  // For periodic cleanup of old entries
}
```

### Workspace Schema Additions
```prisma
// Additions to existing Workspace model in prisma/schema.prisma

// --- Signal Monitoring (v2.0 Phase 18) ---
signalDailyCapUsd     Float    @default(5.0)          // Per-workspace daily PredictLeads+Serper spend cap
signalEnabledTypes    String   @default("[]")           // JSON array: ["job_change","funding","hiring_spike","tech_adoption","news","social_mention"]
signalCompetitors     String   @default("[]")           // JSON array of competitor names for Serper social listening
signalWatchlistDomains String  @default("[]")           // JSON array of specific ABM domains to monitor closely
```

### Railway Cron Dockerfile Pattern (from existing worker/)
```dockerfile
# worker-signals/Dockerfile
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

CMD ["node", "dist/index.js"]
```

```toml
# worker-signals/railway.toml
[deploy]
cronSchedule = "0 */6 * * *"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel cron for background jobs | Railway cron services | 2024+ (Vercel Hobby = 2 crons max) | Signal worker MUST be on Railway — already decided |
| Global cost cap (one cap for all providers) | Per-workspace caps | Phase 18 decision | Each workspace has independent $5/day signal budget |
| Railway persistent process with setInterval | Railway Cron service (exit after run) | Railway's cron feature 2024 | Simpler, no overlap risk, proper job semantics |

**Deprecated/outdated:**
- Vercel cron for the signal worker: The project already has 3 Vercel crons (enrichment jobs process, inbox health check, LinkedIn maintenance) and the Hobby plan allows only 2. Signal worker must be Railway.

---

## Open Questions

1. **PredictLeads endpoint URL format and company lookup**
   - What we know: Base URL is `https://predictleads.com/api/v3/`; authentication is `X-Api-Key` + `X-Api-Token` headers; endpoints exist for job openings, financing events, news events, technology detections, and follow companies
   - What's unclear: Exact path format (e.g., `/companies/{id}/job_openings` vs `/job_openings?domain={domain}`); whether there's a direct domain-to-company lookup, or if Follow Companies endpoint is required first; date filter parameter names for incremental polling
   - Recommendation: On first implementation task, developer must set up PredictLeads trial account and test endpoint URLs before coding the adapter. Plan for an exploration/verification step before coding.

2. **PredictLeads "Follow Companies" vs direct domain lookup**
   - What we know: A "Follow Companies" endpoint exists (POST to follow, GET to list followed, DELETE to unfollow); job openings and other signals are fetchable for "followed companies"
   - What's unclear: Whether you MUST follow a company before fetching its signals, or if you can query by domain directly
   - Recommendation: Assume "follow first, then poll followed companies" is the correct flow. Implement as: (1) sync watchlist domains to PredictLeads follow list at cycle start, (2) poll followed companies' new signals since last cycle.

3. **PredictLeads criteria-based feed (broad discovery)**
   - What we know: The CONTEXT.md describes "criteria-based feed for broad signal discovery (e.g., all funding rounds in fintech)" — this implies a query that returns signals matching criteria rather than domain-specific
   - What's unclear: Whether PredictLeads has a criteria-based feed endpoint, or if this must be built via the financing events list endpoint with filters
   - Recommendation: Implement domain-based watchlist first (clearer API path). Criteria-based feed may require the "Retrieve a list of Financing Events" endpoint with filters — verify during API exploration.

4. **Hiring spike threshold definition**
   - What we know: SIG-03 requires detecting "unusual job posting volume" — this is not a direct API signal type, it's derived from job count changes
   - What's unclear: What baseline defines "spike" — last 30-day average? 2x normal?
   - Recommendation: Define spike as "current active job count > 2x 90-day rolling average for that company." This requires storing historical job counts per company, or computing it from SignalEvent history. Simpler alternative: treat any company with >10 new job postings in a 6-hour cycle as a hiring spike signal.

5. **Social listening dedup TTL**
   - What we know: `SeenSignalUrl` table stores seen URLs; Reddit posts can stay indexed for months
   - What's unclear: How long to keep seen URLs before allowing re-detection (maybe post was updated significantly)
   - Recommendation: 30-day TTL on `SeenSignalUrl` records. Matches the signal stacking window. Clean up in same cycle cleanup pass as expired signals.

---

## Validation Architecture

> Skipped — `workflow.nyquist_validation` is not set in `.planning/config.json` (defaults to false/absent).

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `worker/src/index.ts`, `worker/src/worker.ts`, `worker/src/scheduler.ts` — Railway worker pattern, TypeScript, Dockerfile
- Existing codebase: `src/lib/enrichment/costs.ts` — daily cap, `DailyCostTotal` pattern, `todayUtc()`, `checkDailyCap()`, `incrementDailySpend()`
- Existing codebase: `src/lib/enrichment/queue.ts` — DAILY_CAP_HIT pattern, job pause/resume
- Existing codebase: `src/lib/discovery/adapters/serper.ts` — `searchSocial()` method, returns raw results for Phase 18 use
- Existing codebase: `prisma/schema.prisma` — All existing models, Workspace fields, `DailyCostTotal`, soft-link pattern
- Existing codebase: `src/lib/slack.ts` — `postMessage()` pattern for budget alerts
- Railway docs: https://docs.railway.com/reference/cron-jobs — cron scheduling, 5-min minimum, UTC-based, must-exit requirement
- Railway blog: https://blog.railway.com/p/run-scheduled-and-recurring-tasks-with-cron — exit behavior, logging requirements

### Secondary (MEDIUM confidence)
- PredictLeads docs overview: https://docs.predictleads.com/ — dataset categories, endpoint groupings, authentication sections exist
- PredictLeads swagger: https://docs.predictleads.com/v3/swagger — endpoint list (Follow Companies, Job Openings, Financing Events, News Events, Technology Detections)
- PredictLeads blog: https://blog.predictleads.com/2024/08/21/introducing-predictleads-new-technology-detection-api-endpoint — auth pattern (`X-Api-Key` + `X-Api-Token` OR `api_token` + `api_key` query params); endpoint URL structure `https://predictleads.com/api/v3/discover/technologies/{TECHNOLOGY_ID}/technology_detections`
- PredictLeads search result: `0 */6 * * *` is valid cron syntax for every 6 hours

### Tertiary (LOW confidence)
- PredictLeads endpoint paths for company-scoped queries: Based on Swagger overview + common REST conventions; exact URLs need verification against live API
- Hiring spike threshold logic: Reasoned from requirements; no authoritative source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — uses existing project patterns exactly
- Architecture: HIGH — based on verified existing worker/ pattern; cron exit behavior documented by Railway
- PredictLeads integration: MEDIUM — endpoint categories verified; exact URL format and params need live API verification
- Prisma schema: HIGH — models follow exact project patterns (soft links, JSON arrays, `@@unique` composite keys)
- Budget governor: HIGH — direct copy of existing `DailyCostTotal` pattern, scoped to workspace
- Pitfalls: HIGH — all based on verifiable Railway cron docs + existing code patterns

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (Railway cron docs stable; PredictLeads API may update)
