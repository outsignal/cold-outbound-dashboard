# Phase 21: Signal Dashboard + CLI Chat - Research

**Researched:** 2026-03-04
**Domain:** Next.js dashboard UI with polling + recharts, Node.js interactive CLI with readline and multi-turn agent
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Signal Feed Layout**
- Table rows (not cards or timeline) — dense, sortable, filterable
- Columns: time, company, signal type, workspace
- Color-coded badges/pills per signal type (funding, job_change, hiring_spike, tech_adoption, news, social_mention)
- Combined view showing all workspaces by default, with a dropdown filter to narrow to one workspace
- Auto-refresh via polling every 30 seconds, with "Last updated: X" timestamp display

**Cost & Analytics Views**
- Top row of summary cards: total daily cost, total weekly cost, total signals
- Per-workspace breakdown table below summary cards
- One bar chart showing signal type distribution (funding vs hiring vs job changes etc) — no other charts
- Color warning on cost card: yellow at 80% of daily cap, red at 100%
- Time range: today + last 7 days (no configurable date picker)

**CLI Chat Experience**
- Workspace selection on launch (interactive picker), switchable mid-session via `/workspace` command
- Colored text + tables for agent outputs (leads, campaigns, research) using chalk or similar
- Prompt format: `[workspace] >` (e.g., `[rise] >`, `[outsignal] >`)
- Utility commands: `/help`, `/workspace`, `/clear`, `/exit` — everything else goes to the orchestrator
- Entry point: `npm run chat`

**Session Persistence**
- Every CLI session auto-saves as an AgentRun record on exit — zero friction
- No session resume — always start fresh. Previous sessions exist for audit only
- Full conversation recorded: all messages (user + agent), workspace used, timestamp, duration, tools called

### Claude's Discretion
- Exact color palette for signal type badges
- Table pagination or virtual scroll for large signal feeds
- Loading skeleton design for dashboard
- Error state handling for API failures
- Exact chalk color scheme for CLI output

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Admin can view live signal feed showing recent signals across all clients | API endpoint querying SignalEvent with pagination/filtering; polling pattern established in agent-runs page |
| DASH-02 | Dashboard shows per-client signal breakdown (signals fired, leads generated, cost) | Aggregate query on SignalEvent + SignalCampaignLead grouped by workspaceSlug; existing enrichment-costs page shows exact pattern for workspace-breakdown table |
| DASH-03 | Dashboard shows signal type distribution (funding, job changes, hiring, tech, news, social) | GROUP BY signalType query on SignalEvent; BarChart component already in recharts — existing campaign-chart.tsx shows exact usage pattern |
| DASH-04 | Dashboard shows daily/weekly cost tracking for signal monitoring per workspace | SignalDailyCost table already populated by Phase 18 worker; query last 7 days + today by workspaceSlug |
| DASH-05 | SignalEvent data persists for long-term pattern analysis (signal → conversion correlation over time) | Schema already complete from Phase 18 (SIG-08). No new DB work needed — data is being written. Validation: count SignalEvent rows to confirm data exists |
| CLI-01 | Admin can start interactive chat session with orchestrator agent from terminal | Node.js readline/interface pattern; existing scripts/ dir uses tsx pattern; `npm run chat` entry point needs new script |
| CLI-02 | CLI chat supports all existing orchestrator capabilities | orchestratorConfig is already exportable; reuse orchestratorTools and ORCHESTRATOR_SYSTEM_PROMPT from src/lib/agents/orchestrator.ts |
| CLI-03 | CLI chat maintains conversation context across multiple turns within a session | Vercel AI SDK `generateText` with `messages` array accumulated across turns; message history kept in-memory as CoreMessage[] |
</phase_requirements>

## Summary

Phase 21 splits cleanly into two independent workstreams: a signals intelligence dashboard page (`/admin/signals`) and an interactive CLI chat (`scripts/chat.ts` + `npm run chat`). Both are self-contained — the dashboard has no CLI dependency and the CLI has no browser dependency.

The dashboard work is largely a data query + UI problem. The SignalEvent and SignalDailyCost tables were built and populated in Phase 18. No schema migrations are needed. The primary work is building the API route (`GET /api/signals`) that aggregates the data, and the `(admin)/signals/page.tsx` that renders it. The codebase has mature patterns to follow: `enrichment-costs/page.tsx` shows the exact SummaryCard + BarChart + table pattern with skeleton loading, and `agent-runs/page.tsx` shows the 30-second interval polling with "silent" refresh. Recharts is already installed (v3.7.0) and used.

The CLI chat work is a Node.js script that drives the existing orchestrator in a REPL loop. The pattern is straightforward: readline for input, `generateText` with accumulated message history for multi-turn context, chalk for colored output. The existing `scripts/` directory already shows how to load the Prisma client, load env vars, and call agent functions from outside Next.js. The key insight is that the CLI needs to call `generateText` (not `streamText`) because streaming to a terminal requires different handling, though streaming is feasible too. Session persistence maps directly to an AgentRun record using the established schema.

**Primary recommendation:** Build the dashboard API + page first (DASH-01 through DASH-05 share one API endpoint and one page file). Then build the CLI script as a standalone `scripts/chat.ts` using existing orchestrator exports. The two workstreams have zero shared code.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.7.0 | BarChart for signal type distribution | Already installed; used in enrichment-costs and campaign-chart |
| nuqs | ^2.8.8 | URL-persisted workspace filter dropdown | Already used in agent-runs and people pages for filter state |
| lucide-react | ^0.575.0 | Icons (Zap, Activity, DollarSign, etc.) | Already installed; used everywhere |
| @ai-sdk/anthropic | ^3.0.46 | `generateText` for CLI multi-turn agent | Already installed; orchestrator uses it |
| readline (built-in) | Node.js built-in | CLI REPL input loop | No install needed; standard Node.js |
| chalk | NOT installed | Colored terminal output | Needs install — see below |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | ^4.21.0 | Run TypeScript scripts directly | Already installed as devDep; used for all scripts/ |
| dotenv | Included in process | Load .env.local for CLI | Already used in generate-copy.ts and ingest-document.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| readline (built-in) | inquirer, prompts, @clack/prompts | inquirer is great for workspace picker UX but adds a dependency; readline is sufficient and zero-install |
| chalk | picocolors, kleur | chalk is most widely known; any of these work; chalk supports template literals and is ergonomic |
| generateText (batch) | streamText (streaming) | streamText to terminal requires process.stdout.write per chunk which works fine; generateText is simpler for initial implementation; both are valid |

**Installation:**
```bash
npm install chalk
```

Note: chalk v5+ is ESM-only. Since the project uses CommonJS/tsx compilation, use chalk v4 (latest CommonJS version):
```bash
npm install chalk@4
```

Check project tsconfig before installing — if `"module": "ESNext"` with `"moduleResolution": "bundler"`, chalk v5 may work. The existing scripts/ files use `import` syntax with `tsx`, which handles ESM. Use chalk v5 if tsx handles it cleanly.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (admin)/
│   │   └── signals/
│   │       └── page.tsx          # Signal dashboard (client component, polling)
│   └── api/
│       └── signals/
│           └── route.ts          # GET /api/signals — aggregated signal data
scripts/
└── chat.ts                       # Interactive CLI chat entry point
```

### Pattern 1: Dashboard API — Aggregate SignalEvent + SignalDailyCost
**What:** Single GET endpoint that returns all data the dashboard needs in one request
**When to use:** Dashboard loads once, polls every 30s — one round-trip is better than 3

```typescript
// GET /api/signals?workspace=all (or workspace=rise)
// Returns: { feed, summary, perWorkspace, typeDistribution, costSummary }

const [
  feedEvents,
  typeDistribution,
  workspaceCosts,
  signalCampaignLeads,
] = await Promise.all([
  // Feed: last 100 signals sorted by detectedAt desc
  prisma.signalEvent.findMany({
    where: workspaceFilter ? { workspaceSlug: workspaceFilter } : {},
    orderBy: { detectedAt: "desc" },
    take: 100,
    select: {
      id: true,
      signalType: true,
      companyName: true,
      companyDomain: true,
      workspaceSlug: true,
      title: true,
      isHighIntent: true,
      detectedAt: true,
      status: true,
    },
  }),
  // Type distribution: group by signalType
  prisma.signalEvent.groupBy({
    by: ["signalType"],
    where: { detectedAt: { gte: sevenDaysAgo } },
    _count: { signalType: true },
  }),
  // Cost: today + last 7 days from SignalDailyCost
  prisma.signalDailyCost.findMany({
    where: { date: { gte: sevenDaysAgoStr } },
    orderBy: { date: "desc" },
  }),
  // Leads generated by signal campaigns (for per-workspace breakdown)
  prisma.signalCampaignLead.groupBy({
    by: ["workspaceSlug"],  // NOTE: check actual schema — may need campaign join
    where: { outcome: "added", createdAt: { gte: sevenDaysAgo } },
    _count: { id: true },
  }),
]);
```

**Key note on SignalCampaignLead:** The current schema stores `workspaceSlug` indirectly via the campaign relation. Verify the actual schema before writing the query. May need to join through SignalCampaign to get workspaceSlug.

### Pattern 2: Dashboard Page — Polling with "silent" refresh
**What:** Client component that fetches on mount and polls every 30 seconds
**When to use:** This is the established pattern in agent-runs/page.tsx

```typescript
// From agent-runs/page.tsx — replicate this exact pattern
const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

const fetchData = useCallback(async (silent = false) => {
  if (!silent) setLoading(true);
  try {
    const res = await fetch(`/api/signals?workspace=${workspaceFilter}`);
    const json = await res.json();
    setData(json);
    setLastUpdated(new Date());
  } catch { /* silent fail on auto-refresh */ }
  finally { if (!silent) setLoading(false); }
}, [workspaceFilter]);

// Auto-poll every 30 seconds
useEffect(() => {
  const interval = setInterval(() => fetchData(true), 30_000);
  return () => clearInterval(interval);
}, [fetchData]);
```

### Pattern 3: Signal Type Badges — Color-coded pills
**What:** Inline component mapping signal type strings to Tailwind color classes
**When to use:** Renders in signal feed table and potentially type distribution chart labels

```typescript
// Follows STATUS_BADGE_CLASSES pattern from pipeline/page.tsx
const SIGNAL_TYPE_COLORS: Record<string, { badge: string; dot: string }> = {
  funding:         { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  job_change:      { badge: "bg-blue-50 text-blue-700",      dot: "bg-blue-500" },
  hiring_spike:    { badge: "bg-violet-50 text-violet-700",  dot: "bg-violet-500" },
  tech_adoption:   { badge: "bg-amber-50 text-amber-700",    dot: "bg-amber-500" },
  news:            { badge: "bg-slate-50 text-slate-700",    dot: "bg-slate-500" },
  social_mention:  { badge: "bg-rose-50 text-rose-700",      dot: "bg-rose-500" },
};

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  funding: "Funding",
  job_change: "Job Change",
  hiring_spike: "Hiring Spike",
  tech_adoption: "Tech Adoption",
  news: "News",
  social_mention: "Social",
};

function SignalTypeBadge({ type }: { type: string }) {
  const colors = SIGNAL_TYPE_COLORS[type] ?? { badge: "bg-muted text-muted-foreground", dot: "bg-muted" };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", colors.badge)}>
      {SIGNAL_TYPE_LABELS[type] ?? type}
    </span>
  );
}
```

### Pattern 4: Cost Warning Color — Yellow/Red thresholds
**What:** Summary card changes color based on cost vs. daily cap
**When to use:** Cost card in summary row

```typescript
// Per workspace: compare totalUsd against signalDailyCapUsd
// Global view: sum all workspace costs + caps
function getCostCardClass(spent: number, cap: number): string {
  const pct = cap > 0 ? spent / cap : 0;
  if (pct >= 1.0) return "text-destructive";        // red at 100%
  if (pct >= 0.8) return "text-amber-500";           // yellow at 80%
  return "text-brand-strong";                         // normal (brand green-yellow)
}
```

### Pattern 5: CLI Chat — Multi-turn REPL with accumulated history
**What:** Node.js readline loop that maintains CoreMessage[] history and calls generateText each turn
**When to use:** CLI chat script — each turn appends user + assistant messages, achieving conversation context (CLI-03)

```typescript
// scripts/chat.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import * as readline from "readline";
import { generateText, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { CoreMessage } from "ai";
import { orchestratorConfig, orchestratorTools } from "../src/lib/agents/orchestrator";
import { prisma } from "../src/lib/db";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: CoreMessage[] = [];
let workspaceSlug = ""; // set by workspace picker
const sessionStart = Date.now();
const allSteps: unknown[] = []; // accumulate tool call steps for AgentRun record

async function chat(userInput: string): Promise<string> {
  messages.push({ role: "user", content: userInput });

  const result = await generateText({
    model: anthropic(orchestratorConfig.model),
    system: orchestratorConfig.systemPrompt + `\nCurrent workspace: ${workspaceSlug}`,
    messages,
    tools: orchestratorTools,
    stopWhen: stepCountIs(orchestratorConfig.maxSteps ?? 12),
  });

  // Accumulate tool steps for session record
  for (const step of result.steps) {
    for (const tc of step.toolCalls) {
      allSteps.push({ toolName: tc.toolName, args: (tc as { input?: unknown }).input });
    }
  }

  messages.push({ role: "assistant", content: result.text });
  return result.text;
}

async function saveSession(exitReason: string) {
  const durationMs = Date.now() - sessionStart;
  await prisma.agentRun.create({
    data: {
      agent: "orchestrator",
      workspaceSlug: workspaceSlug || null,
      input: JSON.stringify({ sessionType: "cli-chat", messages: messages.slice(0, 5) }),
      output: JSON.stringify({ messageCount: messages.length, exitReason }),
      steps: JSON.stringify(allSteps),
      status: "complete",
      durationMs,
      triggeredBy: "cli",
    },
  });
}
```

### Pattern 6: Workspace Picker on CLI Launch
**What:** Interactive selection before entering the REPL loop
**When to use:** CLI launch — replicate the select pattern using readline.question

```typescript
// Fetch workspaces and show numbered list
const workspaces = await prisma.workspace.findMany({
  select: { slug: true, name: true },
  orderBy: { name: "asc" },
});

console.log(chalk.bold("\nSelect a workspace:"));
workspaces.forEach((ws, i) => {
  console.log(`  ${chalk.yellow(String(i + 1))}. ${ws.name} (${chalk.dim(ws.slug)})`);
});

const answer = await new Promise<string>((resolve) =>
  rl.question(chalk.cyan("\nEnter number: "), resolve)
);

const idx = parseInt(answer, 10) - 1;
if (idx >= 0 && idx < workspaces.length) {
  workspaceSlug = workspaces[idx].slug;
}
```

### Anti-Patterns to Avoid

- **Loading the entire messages array into AgentRun.input:** The input JSON column stores the first few messages as a sample — not the full history (can be very large). Store full conversation history in `output` or a dedicated column if needed, or truncate.
- **Using `streamText` without a streaming output handler in CLI:** If using streamText in CLI, must handle `result.textStream` as an async iterable writing to process.stdout. Using `generateText` (batch) is simpler and avoids this complexity.
- **Creating a new PrismaClient per readline prompt:** Reuse a single PrismaClient instance throughout the session. The existing `src/lib/db.ts` singleton cannot be used directly in scripts (path alias issue), so instantiate once at script top.
- **Forgetting `await prisma.$disconnect()` on CLI exit:** Scripts must disconnect Prisma on exit or the process hangs. Handle SIGINT + normal exit both.
- **Date arithmetic across UTC midnight:** SignalDailyCost uses `"YYYY-MM-DD"` UTC strings. All queries must use UTC date strings, not local date. Use `new Date().toISOString().slice(0, 10)` for today.
- **Not handling `externalId: null` uniqueness:** SignalEvent has `@@unique([source, externalId])` but externalId is nullable — hiring spike signals always use `null`. The dedup logic already handles this in Phase 18; dashboard queries don't need special handling.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Terminal colors | ANSI escape sequences manually | chalk@4 or chalk@5 | chalk handles reset codes, level detection, template literals |
| CLI spinner/loading | Raw terminal cursor tricks | ora (optional) | ora handles the spinner animation and clear-on-complete; not strictly needed for this phase |
| URL-persisted filters | Custom router manipulation | nuqs (already installed) | `useQueryState` keeps workspace filter in URL — already used in agent-runs/page.tsx |
| Recharts bar chart | Custom SVG chart | recharts (already installed) | BarChart with ResponsiveContainer — identical usage pattern in enrichment-costs/page.tsx |
| Table sorting | Custom sort logic | Client-side sort with `useMemo` | Small dataset (100 rows); no library needed; same approach as existing tables |

**Key insight:** The project has established patterns for every UI need in this phase. Copy from enrichment-costs/page.tsx (cost cards, charts), agent-runs/page.tsx (polling, filter dropdowns), and pipeline/page.tsx (status badges) rather than inventing new patterns.

## Common Pitfalls

### Pitfall 1: chalk ESM vs CommonJS
**What goes wrong:** `import chalk from 'chalk'` with chalk v5 fails in tsx if the project is configured as CommonJS
**Why it happens:** chalk v5 is pure ESM; tsx can handle it but some tsconfig configurations reject it
**How to avoid:** Check `package.json` for `"type": "module"` — the current package.json does NOT have it, so the project is CommonJS by default. Use chalk v4 (`npm install chalk@4`) OR use dynamic import: `const { default: chalk } = await import('chalk')`. The safest approach: use chalk v4.
**Warning signs:** `Error [ERR_REQUIRE_ESM]: require() of ES Module` at runtime

### Pitfall 2: Path Aliases Break in CLI Scripts
**What goes wrong:** `import { prisma } from "@/lib/db"` fails in `scripts/chat.ts`
**Why it happens:** Path aliases (`@/`) are resolved by Next.js webpack, not by tsx's runtime module resolver
**How to avoid:** Use relative paths in scripts: `import { prisma } from "../src/lib/db"`. But check if `tsconfig.json` has `paths` configured and if tsx respects it. Existing scripts (generate-copy.ts) already avoid `@/` imports — they duplicate code inline or use relative paths. The CLI chat script should follow the same pattern: import `orchestratorConfig` and `orchestratorTools` via relative path.

**IMPORTANT EXCEPTION:** tsx v4 does support path aliases via `tsconfig.json` `paths`. Check `tsconfig.json` for `"@/*": ["./src/*"]` — if present, tsx v4 should resolve `@/lib/agents/orchestrator` correctly. The existing `generate-copy.ts` script does NOT use `@/` imports, suggesting this wasn't tested. Verify before implementing.

### Pitfall 3: AgentRun Schema Mismatch for Orchestrator Sessions
**What goes wrong:** `agent` field on AgentRun accepts free-form string but the dashboard filters by known agent names ("research", "leads", "writer", "campaign")
**Why it happens:** agent-runs/page.tsx shows filter options for only 4 known agents; "orchestrator" CLI sessions will appear as unfiltered entries
**How to avoid:** Use `agent: "orchestrator"` and `triggeredBy: "cli"` — the dashboard already has "All Agents" as default. The orchestrator is already used as agent name in orchestratorConfig (`name: "orchestrator"`). The agent-runs UI will need updating in a future phase if the admin wants to filter CLI sessions, but this doesn't block Phase 21 correctness.

### Pitfall 4: SignalCampaignLead workspaceSlug for Breakdown
**What goes wrong:** Per-workspace "leads generated" count query fails because SignalCampaignLead may not have `workspaceSlug` directly
**Why it happens:** The schema stores the campaign relation, not a direct workspace denormalization
**How to avoid:** Check the actual SignalCampaignLead schema before writing the breakdown query. May need: `prisma.signalCampaignLead.findMany({ include: { campaign: { select: { workspaceSlug: true } } } })` then aggregate in JS, or a raw SQL groupBy. The simpler fallback: just use SignalEvent.workspaceSlug for the count (signals fired per workspace), omitting leads-generated if the schema makes that hard. DASH-02 says "signals fired, leads generated, cost" — if leads-generated is complex, use `signalLeadCount` from SignalCampaignLead joined through campaigns.

### Pitfall 5: Polling Interval Memory Leak
**What goes wrong:** Multiple intervals stack up when component re-renders or filters change
**Why it happens:** `setInterval` registered in `useEffect` not properly cleaned up when dependencies change
**How to avoid:** Follow the exact pattern from agent-runs/page.tsx — use `useRef` to hold the interval ref, clear it in cleanup, and conditionally restart. The existing code is correct and should be copied verbatim.

### Pitfall 6: CLI Process Hanging After Chat
**What goes wrong:** `npm run chat` completes but the process doesn't exit
**Why it happens:** PrismaClient connection pool keeps the event loop alive
**How to avoid:** Always call `await prisma.$disconnect()` in the finally block, AND call `rl.close()`. Also handle `SIGINT` (Ctrl+C) to save session and exit cleanly:
```typescript
process.on("SIGINT", async () => {
  console.log("\n\nSaving session...");
  await saveSession("sigint");
  await prisma.$disconnect();
  rl.close();
  process.exit(0);
});
```

## Code Examples

### Signal Feed API Route
```typescript
// Source: project pattern — src/app/api/agent-runs/route.ts + enrichment cost pattern
// GET /api/signals?workspace=all&limit=100

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspace = searchParams.get("workspace");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const workspaceWhere = workspace && workspace !== "all"
    ? { workspaceSlug: workspace }
    : {};

  const [feed, typeDistribution, costs] = await Promise.all([
    prisma.signalEvent.findMany({
      where: workspaceWhere,
      orderBy: { detectedAt: "desc" },
      take: limit,
      select: {
        id: true, signalType: true, companyName: true, companyDomain: true,
        workspaceSlug: true, title: true, isHighIntent: true,
        detectedAt: true, status: true,
      },
    }),
    prisma.signalEvent.groupBy({
      by: ["signalType"],
      where: { detectedAt: { gte: sevenDaysAgo }, ...workspaceWhere },
      _count: { signalType: true },
    }),
    prisma.signalDailyCost.findMany({
      where: { date: { gte: sevenDaysAgoStr }, ...workspaceWhere },
      orderBy: { date: "asc" },
    }),
  ]);

  // Aggregate costs
  const todayCosts = costs.filter(c => c.date === todayStr);
  const totalDailyUsd = todayCosts.reduce((sum, c) => sum + c.totalUsd, 0);
  const totalWeeklyUsd = costs.reduce((sum, c) => sum + c.totalUsd, 0);

  // Per-workspace cost breakdown
  const costByWorkspace = costs.reduce<Record<string, number>>((acc, c) => {
    acc[c.workspaceSlug] = (acc[c.workspaceSlug] ?? 0) + c.totalUsd;
    return acc;
  }, {});

  return NextResponse.json({
    feed,
    typeDistribution: typeDistribution.map(t => ({
      name: t.signalType,
      count: t._count.signalType,
    })),
    summary: {
      totalSignals: feed.length,
      totalDailyUsd,
      totalWeeklyUsd,
    },
    costByWorkspace,
  });
}
```

### Bar Chart for Signal Type Distribution
```typescript
// Source: enrichment-costs/page.tsx recharts pattern
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Data shape: [{ name: "funding", count: 12 }, { name: "job_change", count: 45 }, ...]
<ResponsiveContainer width="100%" height={220}>
  <BarChart data={typeDistribution} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
    <XAxis
      dataKey="name"
      tick={{ fill: "oklch(0.45 0 0)", fontSize: 11 }}
      axisLine={false}
      tickLine={false}
      tickFormatter={(v: string) => SIGNAL_TYPE_LABELS[v] ?? v}
    />
    <YAxis
      tick={{ fill: "oklch(0.45 0 0)", fontSize: 11 }}
      axisLine={false}
      tickLine={false}
      width={32}
    />
    <Tooltip
      formatter={(value: number) => [value, "Signals"]}
      contentStyle={{
        backgroundColor: "white",
        border: "1px solid oklch(0.92 0 0)",
        borderRadius: "6px",
      }}
    />
    <Bar dataKey="count" fill="oklch(0.95 0.15 110)" radius={[3, 3, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### CLI Chat Main Loop
```typescript
// scripts/chat.ts — core REPL loop
async function startChatLoop() {
  console.log(chalk.bold.green(`\n[${workspaceSlug}] Chat session started`));
  console.log(chalk.dim('Type /help for commands, /exit to quit\n'));

  const prompt = () => {
    rl.question(chalk.cyan(`[${workspaceSlug}] > `), async (input) => {
      const trimmed = input.trim();
      if (!trimmed) { prompt(); return; }

      // Utility commands
      if (trimmed === "/exit" || trimmed === "/quit") {
        await handleExit();
        return;
      }
      if (trimmed === "/clear") {
        console.clear();
        prompt();
        return;
      }
      if (trimmed === "/help") {
        printHelp();
        prompt();
        return;
      }
      if (trimmed === "/workspace") {
        await pickWorkspace(); // updates workspaceSlug
        prompt();
        return;
      }

      // Orchestrator call
      try {
        process.stdout.write(chalk.dim("Thinking..."));
        const response = await chat(trimmed);
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        console.log(chalk.white("\n" + response + "\n"));
      } catch (err) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        console.error(chalk.red("Error: " + (err instanceof Error ? err.message : String(err))));
      }
      prompt();
    });
  };

  prompt();
}
```

### Adding /signals to Sidebar Navigation
```typescript
// src/components/layout/sidebar.tsx — add to STATIC_NAV_GROUPS
// In the "overview" group or a new "Intelligence" group
import { Zap } from "lucide-react"; // signal/zap icon fits

// Add to overview group items:
{ href: "/signals", label: "Signals", icon: Zap },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SSR data fetch with revalidate | Client-side polling with `setInterval` | Established in agent-runs page | Real-time feel without WebSockets |
| process.argv parsing | Same — still standard for scripts | N/A | readline for REPL, argv for one-shot scripts |
| `generateText` single-turn | `generateText` with `messages` array | AI SDK v3+ supports multi-turn via messages array | CLI multi-turn context (CLI-03) requires passing accumulated history |

**Deprecated/outdated:**
- `readline.Interface` question callback pattern: still valid but `readline/promises` (Node 17+) supports `await rl.question()`. The project likely targets Node 20+ given Next.js 16. Using the promise-based API makes the code cleaner (no nested callbacks). Use `import * as readline from "readline/promises"` — but verify Node version compatibility with `engines` field in package.json if present.

## Open Questions

1. **Can tsx resolve `@/` path aliases?**
   - What we know: tsx v4 respects tsconfig.json `paths`. The tsconfig has `"@/*": ["./src/*"]`. Existing scripts (generate-copy.ts) avoid `@/` but this may be precautionary, not a hard limitation.
   - What's unclear: Whether `src/lib/agents/orchestrator.ts` can be cleanly imported from `scripts/chat.ts` via `@/` alias, or whether the import chain (orchestrator → runner → Prisma client) introduces issues.
   - Recommendation: Test with a simple import first. If `@/` works, use it for cleanliness. If not, use relative paths. The script should import orchestratorConfig and orchestratorTools from `../src/lib/agents/orchestrator`.

2. **SignalCampaignLead schema — does it have workspaceSlug?**
   - What we know: Phase 19 schema added SignalCampaignLead. The STATE.md mentions `signalLeadCount queries prisma.signalCampaignLead with outcome=added`. workspaceSlug on this table was not confirmed.
   - What's unclear: The exact schema shape of SignalCampaignLead and whether workspace can be derived without a join.
   - Recommendation: Check the actual `prisma/schema.prisma` SignalCampaignLead definition. If no direct workspaceSlug, use a raw groupBy query or aggregate in application code.

3. **Daily cap for global cost warning — what's the aggregate?**
   - What we know: signalDailyCapUsd is per-workspace on the Workspace model. The dashboard "daily cost" card should show global or per-workspace spend.
   - What's unclear: For the global combined view, should the cap warning compare against sum of all workspace caps, or just show the highest utilization?
   - Recommendation: For the combined "all workspaces" view, show total daily spend with a note. For per-workspace view, show that workspace's spend vs. its cap. The color warning only applies to per-workspace view where the cap is known.

## Validation Architecture

> Skipping this section — `workflow.nyquist_validation` is not set in `.planning/config.json` (absent = false per GSD convention). No test infrastructure changes needed.

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/app/(admin)/enrichment-costs/page.tsx` — SummaryCard + BarChart + per-workspace table pattern; direct model for dashboard
- Project codebase: `src/app/(admin)/agent-runs/page.tsx` — 30-second polling with silent refresh + workspace filter dropdown; direct model for signal feed
- Project codebase: `src/app/(admin)/pipeline/page.tsx` — STATUS_BADGE_CLASSES pattern for color-coded badges; model for signal type badges
- Project codebase: `src/lib/agents/orchestrator.ts` — orchestratorConfig, orchestratorTools, ORCHESTRATOR_SYSTEM_PROMPT all exported; CLI can reuse directly
- Project codebase: `scripts/generate-copy.ts` — established pattern for CLI scripts with Prisma, env loading, tsx runner
- Project codebase: `prisma/schema.prisma` (SignalEvent, SignalDailyCost, AgentRun) — confirmed schema shape for all queries
- Project codebase: `package.json` — confirmed recharts ^3.7.0 installed, tsx ^4.21.0 installed, chalk NOT installed

### Secondary (MEDIUM confidence)
- Recharts v3 BarChart API — confirmed from existing usage in `enrichment-costs/page.tsx` and `campaign-chart.tsx`; same API works for signal type distribution
- Node.js readline/promises — available in Node 17+ (confirmed standard); project using Node 20+ (Next.js 16 requirement)

### Tertiary (LOW confidence)
- chalk@4 vs chalk@5 ESM compatibility — LOW confidence on exact behavior with tsx; recommend chalk@4 (CommonJS-safe) to avoid any ESM edge cases

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json or are Node.js built-ins
- Architecture: HIGH — all patterns copied directly from working project code
- CLI chat approach: HIGH — orchestratorConfig and orchestratorTools are already cleanly exported; generateText with messages array is established pattern
- Pitfalls: HIGH for Node-specific (ESM chalk, process hanging), MEDIUM for schema queries (SignalCampaignLead workspaceSlug unverified)

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable stack — recharts, readline, AI SDK patterns are stable)
